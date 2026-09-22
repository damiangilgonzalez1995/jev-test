"use client";

import { useState } from "react";
import type { Run } from "@/lib/trace";
import type { Answer, Question } from "@/lib/types";

type Props = {
  runs: Run[];
  questions: Record<string, Question>;
  onClear: () => void;
};

type Summary = { label: string; pct: number; bars: { label: string; p: number }[]; extra?: string };

/** Reduce cualquier respuesta a «qué ha contestado, con qué seguridad y cómo se reparte». */
function summarize(a: Answer): Summary {
  if (a.type === "noul") {
    const yes = a.noul >= 0.5;
    return {
      label: yes ? "sí" : "no",
      pct: yes ? a.noul : 1 - a.noul,
      bars: [
        { label: "sí", p: a.noul },
        { label: "no", p: 1 - a.noul },
      ],
    };
  }
  if (a.type === "choice") {
    return {
      label: a.choice,
      pct: a.probabilities[a.choice] ?? 0,
      bars: Object.entries(a.probabilities)
        .sort((x, y) => y[1] - x[1])
        .map(([label, p]) => ({ label, p })),
      extra: `confianza ${Math.round(a.confidence * 100)}%`,
    };
  }
  const levels = Object.keys(a.legend);
  const top = levels.reduce((best, l) => ((a.probabilities[l] ?? 0) > (a.probabilities[best] ?? 0) ? l : best), levels[0]);
  return {
    label: a.legend[top] ?? top,
    pct: a.probabilities[top] ?? 0,
    bars: levels.map((l) => ({ label: a.legend[l], p: a.probabilities[l] ?? 0 })),
    extra: `nota ${a.score.toFixed(1)} / ${levels.length - 1}`,
  };
}

export function ResultsPanel({ runs, questions, onClear }: Props) {
  const run = runs[runs.length - 1];

  return (
    <aside className="flex h-full w-[560px] shrink-0 flex-col border-l border-border bg-bg-elev">
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <div>
          <div className="text-base font-semibold">Respuestas</div>
          <div className="text-[13px] text-fg-dim">misma pregunta, dos modelos</div>
        </div>
        {runs.length > 0 && (
          <button type="button" onClick={onClear} className="text-[13px] text-fg-dim hover:text-fg">
            limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-border px-6 pb-3 text-[12px] font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-2 text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" /> Jev
        </span>
        <span className="flex items-center gap-2 text-info">
          <span className="h-2 w-2 rounded-full bg-info" /> gpt-5-nano
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!run ? (
          <div className="mt-16 text-center text-sm text-fg-dim">Pulsa Ejecutar y aquí verás lo que responde cada modelo.</div>
        ) : (
          <RunView key={run.id} run={run} questions={questions} />
        )}
      </div>
    </aside>
  );
}

function RunView({ run, questions }: { run: Run; questions: Record<string, Question> }) {
  const jev = run.events.find((e) => e.kind === "answers");
  const llm = run.events.find((e) => e.kind === "compare");
  const decision = run.events.find((e) => e.kind === "decision");
  const error = run.events.find((e) => e.kind === "error");
  const jevAnswers = jev?.kind === "answers" ? jev.answers : undefined;
  const llmAnswers = llm?.kind === "compare" ? llm.llm.answers : undefined;
  const pending = run.status === "running";

  const ids = Object.keys(questions);
  const agree = ids.filter((id) => jevAnswers?.[id] && llmAnswers?.[id] && summarize(jevAnswers[id]).label === summarize(llmAnswers[id]).label).length;
  const bothDone = !!jevAnswers && !!llmAnswers;

  return (
    <div className="space-y-4">
      {error?.kind === "error" && (
        <div className="rounded-lg border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">{error.message}</div>
      )}

      {bothDone && (
        <div className="fade-up rounded-lg border border-border bg-bg-panel px-4 py-3 text-sm">
          <span className="font-semibold text-fg">
            Coinciden en {agree} de {ids.length}
          </span>
          <span className="text-fg-muted"> · mira dónde difieren y con qué seguridad responde cada uno</span>
        </div>
      )}

      {ids.map((id, i) => {
        const a = jevAnswers?.[id];
        const b = llmAnswers?.[id];
        const same = a && b ? summarize(a).label === summarize(b).label : null;
        const q = questions[id];
        return (
          <div key={id} className="fade-up rounded-xl border border-border bg-bg-panel p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">{id}</div>
                <div className="truncate text-[13px] text-fg-muted">{typeof q?.instructions === "string" ? q.instructions : ""}</div>
              </div>
              {same !== null && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                    same ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
                  }`}
                >
                  {same ? "✓ coinciden" : "≠ difieren"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AnswerSide answer={a} tone="accent" pending={pending} />
              <AnswerSide answer={b} tone="info" pending={pending} />
            </div>
          </div>
        );
      })}

      {decision?.kind === "decision" && (
        <div
          className={`fade-up rounded-xl border px-4 py-3 ${
            { ok: "border-ok/40 bg-ok-soft", warn: "border-warn/40 bg-warn-soft", bad: "border-bad/40 bg-bad-soft" }[decision.tone]
          }`}
        >
          <div className="text-[12px] uppercase tracking-wider text-fg-dim">Tu código decide (con la respuesta de Jev)</div>
          <div className="mt-1 text-sm font-semibold text-fg">{decision.label}</div>
          <div className="mt-0.5 text-[13px] text-fg-muted">{decision.detail}</div>
        </div>
      )}

      <TechDetail run={run} />
    </div>
  );
}

function AnswerSide({ answer, tone, pending }: { answer?: Answer; tone: "accent" | "info"; pending: boolean }) {
  const text = tone === "accent" ? "text-accent" : "text-info";
  const bar = tone === "accent" ? "bg-accent" : "bg-info";
  const soft = tone === "accent" ? "bg-accent-soft" : "bg-info-soft";

  if (!answer) {
    return (
      <div className={`flex min-h-[112px] items-center justify-center rounded-lg ${soft} text-[13px] ${text}`}>
        {pending ? <span className="pulse">pensando…</span> : <span className="text-fg-dim">sin respuesta</span>}
      </div>
    );
  }
  const s = summarize(answer);
  return (
    <div className={`fade-up rounded-lg ${soft} p-3`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`truncate text-xl font-bold ${text}`}>{s.label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{Math.round(s.pct * 100)}%</span>
      </div>
      {s.extra && <div className="text-[11px] text-fg-muted">{s.extra}</div>}
      <div className="mt-2 space-y-1">
        {s.bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-16 shrink-0 truncate text-fg-muted">{b.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
              <div className={`bar-grow h-full rounded-full ${bar}`} style={{ width: `${b.p * 100}%`, opacity: b.label === s.label ? 1 : 0.35 }} />
            </div>
            <span className="w-8 text-right tabular-nums text-fg-muted">{Math.round(b.p * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** El JSON de verdad, escondido para quien quiera mirarlo. */
function TechDetail({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  const req = run.events.find((e) => e.kind === "request");
  const res = run.events.find((e) => e.kind === "response");
  const cmp = run.events.find((e) => e.kind === "compare");
  return (
    <div className="pt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[13px] text-fg-dim hover:text-fg">
        {open ? "▾" : "▸"} Detalle técnico (JSON)
      </button>
      {open && (
        <div className="fade-up mt-2 space-y-3">
          {req?.kind === "request" && <Json title="Petición a Jev" value={req.request} />}
          {res?.kind === "response" && <Json title="Respuesta de Jev" value={res.raw} />}
          {cmp?.kind === "compare" && <Json title="Respuesta de gpt-5-nano" value={cmp.llm.raw} />}
        </div>
      )}
    </div>
  );
}

function Json({ title, value }: { title: string; value: unknown }) {
  let text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  try {
    if (typeof value === "string") text = JSON.stringify(JSON.parse(value), null, 2);
  } catch {}
  return (
    <div>
      <div className="mb-1 text-[12px] text-fg-dim">{title}</div>
      <pre className="max-h-64 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-fg-muted">{text}</pre>
    </div>
  );
}
