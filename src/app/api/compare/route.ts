import { NextRequest } from "next/server";
import { buildPrompt, buildSchema, costUsd, GATEWAY_MODEL, GATEWAY_URL, toAnswers, type CompareResult } from "@/lib/compare";
import type { JevRequest } from "@/lib/types";

/**
 * Mensajes que la ruta envía al navegador, uno por línea (NDJSON):
 * - `delta`: un trozo del JSON que OpenAI acaba de escribir.
 * - `done`: el resultado final con tiempos, tokens y coste.
 */
export type CompareStreamLine = { type: "delta"; text: string } | { type: "done"; result: CompareResult };

// Envía el mismo estado y las mismas preguntas que a Jev a un LLM barato de OpenAI
// (vía Vercel AI Gateway) con salida estructurada, y retransmite la respuesta en
// streaming para ver el JSON escribirse de verdad.
export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const { state, questions } = (await req.json()) as JevRequest;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: CompareStreamLine) => controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      const started = performance.now();
      const fail = (status: number, raw: string) => {
        send({
          type: "done",
          result: {
            ok: false,
            status,
            model: GATEWAY_MODEL,
            latencyMs: Math.round(performance.now() - started),
            firstTokenMs: null,
            usage: { input_tokens: 0, output_tokens: 0 },
            reasoningTokens: 0,
            costUsd: 0,
            answers: null,
            raw,
          },
        });
        controller.close();
      };

      if (!apiKey) return fail(500, "Falta AI_GATEWAY_API_KEY en .env");

      let upstream: Response;
      try {
        upstream = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: GATEWAY_MODEL,
            messages: [{ role: "user", content: buildPrompt(state, questions) }],
            response_format: buildSchema(questions),
            // Sin razonamiento: gpt-5-nano no admite "none" (lo ignora); "minimal" deja 0 tokens de razonamiento.
            reasoning_effort: "minimal",
            stream: true,
            stream_options: { include_usage: true },
          }),
          cache: "no-store",
        });
      } catch (err) {
        return fail(502, `Error de red: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!upstream.ok || !upstream.body) return fail(upstream.status, await upstream.text());

      // Lee el SSE de OpenAI («data: {...}» por línea) y reenvía cada trozo de texto.
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let firstTokenMs: number | null = null;
      let usage = { prompt_tokens: 0, completion_tokens: 0, completion_tokens_details: { reasoning_tokens: 0 } };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data);
            const text: string | undefined = chunk.choices?.[0]?.delta?.content;
            if (text) {
              firstTokenMs ??= Math.round(performance.now() - started);
              content += text;
              send({ type: "delta", text });
            }
            if (chunk.usage) usage = chunk.usage;
          } catch {}
        }
      }

      let answers: CompareResult["answers"] = null;
      try {
        answers = toAnswers(JSON.parse(content), questions);
      } catch {}

      const input = usage.prompt_tokens ?? 0;
      const output = usage.completion_tokens ?? 0;
      send({
        type: "done",
        result: {
          ok: true,
          status: 200,
          model: GATEWAY_MODEL,
          latencyMs: Math.round(performance.now() - started),
          firstTokenMs,
          usage: { input_tokens: input, output_tokens: output },
          reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
          costUsd: costUsd("llm", input, output),
          answers,
          raw: content,
        },
      });
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
