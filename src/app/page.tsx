"use client";

import { useCallback, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Workbench } from "@/components/Workbench";
import { ResultsPanel } from "@/components/ResultsPanel";
import { EXAMPLES } from "@/lib/examples";
import { PROVIDERS } from "@/lib/providers";
import { costUsd, GATEWAY_MODEL, type CompareResult } from "@/lib/compare";
import type { CompareStreamLine } from "@/app/api/compare/route";
import type { Race } from "@/components/LiveRace";
import type { Run, TraceEvent } from "@/lib/trace";
import {
  parseState,
  type Answer,
  type Example,
  type JevRequest,
  type JevResponse,
  type ProxyResult,
} from "@/lib/types";

// decide() está escrito para las preguntas originales; si las editas puede no aplicar.
function safeDecide(example: Example, answers: Record<string, Answer>) {
  try {
    return example.decide(answers);
  } catch {
    return {
      label: "Sin regla de decisión",
      detail: "Has cambiado las preguntas y la función decide() de este ejemplo ya no encaja. Mira las probabilidades de arriba.",
      tone: "warn" as const,
    };
  }
}

/** Lee la respuesta NDJSON de /api/compare, avisando de cada trozo de texto. */
async function streamCompare(request: JevRequest, onDelta: (text: string) => void): Promise<CompareResult | null> {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: CompareResult | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line) as CompareStreamLine;
      if (msg.type === "delta") onDelta(msg.text);
      else result = msg.result;
    }
  }
  return result;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [selectedId, setSelectedId] = useState(EXAMPLES[0].id);
  const example = useMemo(
    () => EXAMPLES.find((e) => e.id === selectedId) ?? EXAMPLES[0],
    [selectedId],
  );
  const [state, setState] = useState(example.state);
  const [questions, setQuestions] = useState(example.questions);
  const [runs, setRuns] = useState<Run[]>([]);
  const [race, setRace] = useState<Race | null>(null);
  const running = runs.some((r) => r.status === "running");

  const onSelect = (id: string) => {
    setSelectedId(id);
    const ex = EXAMPLES.find((e) => e.id === id);
    if (ex) {
      setState(ex.state);
      setQuestions(ex.questions);
    }
    // Cada ejemplo empieza limpio: sin respuestas ni carrera del anterior.
    setRuns([]);
    setRace(null);
  };

  const run = useCallback(async () => {
    const id = runs.length + 1;
    const push = (ev: TraceEvent, status?: Run["status"]) =>
      setRuns((rs) =>
        rs.map((r) =>
          r.id === id
            ? { ...r, events: [...r.events, ev], status: status ?? r.status }
            : r,
        ),
      );

    const request: JevRequest = {
      model: PROVIDERS.vercel.model,
      state: parseState(state),
      questions,
    };
    setRuns((rs) => [
      ...rs,
      {
        id,
        exampleTitle: example.title,
        startedAt: Date.now(),
        status: "running",
        events: [{ kind: "request", at: Date.now(), request }],
      },
    ]);

    const startedAt = Date.now();
    setRace({ startedAt, ids: Object.keys(questions), llmModel: GATEWAY_MODEL.split("/")[1] });
    const finish = (lane: "jev" | "llm", value: Race["jev"]) =>
      setRace((r) => (r && r.startedAt === startedAt ? { ...r, [lane]: value } : r));

    // En paralelo, la misma petición a un LLM de OpenAI con salida estructurada.
    // Llega en streaming: cada trozo del JSON se añade a la carrera según se escribe.
    const comparison: Promise<CompareResult | null> = streamCompare(request, (text) =>
      setRace((r) => (r && r.startedAt === startedAt ? { ...r, llmText: (r.llmText ?? "") + text } : r)),
    )
      .catch(() => null)
      .then((llm) => {
        finish(
          "llm",
          llm?.ok
            ? {
                latencyMs: llm.latencyMs,
                inputTokens: llm.usage.input_tokens,
                outputTokens: llm.usage.output_tokens,
                costUsd: llm.costUsd,
                firstTokenMs: llm.firstTokenMs,
                reasoningTokens: llm.reasoningTokens,
              }
            : "error",
        );
        return llm;
      });

    let result: ProxyResult;
    try {
      const res = await fetch("/api/jev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      result = (await res.json()) as ProxyResult;
    } catch (err) {
      finish("jev", "error");
      push(
        {
          kind: "error",
          at: Date.now(),
          status: 0,
          message: err instanceof Error ? err.message : String(err),
        },
        "error",
      );
      return;
    }

    if (
      !result.ok ||
      typeof result.body === "string" ||
      !("answers" in result.body)
    ) {
      const message =
        result.status === 401
          ? "Clave API no válida."
          : result.status === 422
            ? "El cuerpo de la petición no ha superado la validación."
            : result.status === 429
              ? "Límite de peticiones alcanzado. Reinténtalo en un momento."
              : typeof result.body === "string"
                ? result.body
                : `La petición ha fallado (HTTP ${result.status}).`;
      finish("jev", "error");
      push(
        {
          kind: "error",
          at: Date.now(),
          status: result.status,
          message,
          raw: result.body,
        },
        "error",
      );
      return;
    }

    const data = result.body as JevResponse;
    finish("jev", {
      latencyMs: result.latencyMs,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      costUsd: costUsd("jev", data.usage.input_tokens, data.usage.output_tokens),
    });
    push({
      kind: "response",
      at: Date.now(),
      latencyMs: result.latencyMs,
      questionIds: data.answers,
      model: data.model,
      usage: data.usage,
      raw: data,
    });
    await wait(250);
    push({ kind: "answers", at: Date.now(), answers: data.answers });
    await wait(350);
    push(
      { kind: "decision", at: Date.now(), ...safeDecide(example, data.answers) },
    );
    const llm = await comparison;
    if (llm) {
      push({
        kind: "compare",
        at: Date.now(),
        jev: {
          latencyMs: result.latencyMs,
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          costUsd: costUsd("jev", data.usage.input_tokens, data.usage.output_tokens),
        },
        llm,
      });
    }
    setRuns((rs) => rs.map((r) => (r.id === id && r.status === "running" ? { ...r, status: "done" } : r)));
  }, [example, questions, runs.length, state]);

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        examples={EXAMPLES}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <Workbench
        example={example}
        state={state}
        onStateChange={setState}
        questions={questions}
        onQuestionsChange={setQuestions}
        race={race}
        onRun={run}
        running={running}
        canRun={state.trim().length > 0}
      />
      <ResultsPanel
        runs={runs}
        questions={questions}
        onClear={() => setRuns([])}
      />
    </main>
  );
}
