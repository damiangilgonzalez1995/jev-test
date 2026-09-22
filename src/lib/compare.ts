import type { Answer, JsonValue, Question } from "@/lib/types";

/** Modelo barato de OpenAI contra el que comparamos, servido por Vercel AI Gateway. */
export const GATEWAY_MODEL = "openai/gpt-5-nano";
export const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

/** Precios en USD por millón de tokens. Revísalos antes de clase: cambian a menudo. */
export const PRICES = {
  jev: { input: 0.042, output: 0 },
  llm: { input: 0.05, output: 0.4 },
} as const;

export function costUsd(model: keyof typeof PRICES, input: number, output: number) {
  const p = PRICES[model];
  return (input * p.input + output * p.output) / 1_000_000;
}

export type CompareResult = {
  ok: boolean;
  status: number;
  model: string;
  latencyMs: number;
  /** Milisegundos hasta el primer carácter visible del JSON (antes solo razona). */
  firstTokenMs: number | null;
  usage: { input_tokens: number; output_tokens: number };
  /** Parte de output_tokens que el modelo gastó razonando y que OpenAI no muestra. */
  reasoningTokens: number;
  costUsd: number;
  /** Respuestas del LLM convertidas al mismo formato que las de Jev. */
  answers: Record<string, Answer> | null;
  raw: string;
};

const prob = { type: "number", description: "Probabilidad entre 0 y 1" };

/** Los niveles de una pregunta score se identifican por su índice ("0", "1", …), igual que el `legend` de Jev. */
const levels = (q: Extract<Question, { type: "score" }>) => q.criteria.map((_, i) => String(i));

function objectOf(keys: string[]) {
  return {
    type: "object",
    properties: Object.fromEntries(keys.map((k) => [k, prob])),
    required: keys,
    additionalProperties: false,
  };
}

/**
 * JSON Schema para Structured Outputs de OpenAI (strict): una propiedad por pregunta,
 * con la misma forma que la respuesta de Jev para esa primitiva.
 */
export function buildSchema(questions: Record<string, Question>) {
  const properties = Object.fromEntries(
    Object.entries(questions).map(([id, q]) => {
      if (q.type === "noul") {
        return [id, { type: "object", properties: { noul: prob }, required: ["noul"], additionalProperties: false }];
      }
      const keys = q.type === "choice" ? Object.keys(q.criteria) : levels(q);
      const props: Record<string, unknown> = { probabilities: objectOf(keys), confidence: prob };
      if (q.type === "choice") props.choice = { type: "string", enum: keys };
      return [id, { type: "object", properties: props, required: Object.keys(props), additionalProperties: false }];
    }),
  );
  return {
    type: "json_schema",
    json_schema: {
      name: "respuestas",
      strict: true,
      schema: { type: "object", properties, required: Object.keys(questions), additionalProperties: false },
    },
  };
}

/** Prompt equivalente a las preguntas de Jev: instrucciones y criterios de cada una. */
export function buildPrompt(state: JsonValue, questions: Record<string, Question>) {
  const spec = Object.entries(questions).map(([id, q]) => {
    const head = `- ${id} (${q.type}): ${JSON.stringify(q.instructions)}`;
    if (q.type === "noul") return `${head}\n  noul = probabilidad de «sí». ${q.criteria ? JSON.stringify(q.criteria) : ""}`;
    if (q.type === "choice") return `${head}\n  opciones: ${JSON.stringify(q.criteria)}`;
    return `${head}\n  niveles: ${JSON.stringify(Object.fromEntries(q.criteria.map((c, i) => [i, c])))}`;
  });
  return [
    "Responde a cada pregunta sobre el estado. Da probabilidades calibradas que sumen 1 por pregunta",
    "(salvo noul) y una confianza entre 0 y 1.",
    "",
    "Preguntas:",
    ...spec,
    "",
    "Estado:",
    typeof state === "string" ? state : JSON.stringify(state, null, 2),
  ].join("\n");
}

type RawAnswer = { noul?: number; choice?: string; probabilities?: Record<string, number>; confidence?: number };

/** Convierte la salida estructurada del LLM en respuestas tipadas como las de Jev. */
export function toAnswers(raw: Record<string, RawAnswer>, questions: Record<string, Question>) {
  const out: Record<string, Answer> = {};
  for (const [id, q] of Object.entries(questions)) {
    const r = raw[id];
    if (!r) continue;
    if (q.type === "noul") {
      out[id] = { type: "noul", noul: r.noul ?? 0 };
      continue;
    }
    const probabilities = normalize(r.probabilities ?? {});
    if (q.type === "choice") {
      out[id] = { type: "choice", choice: r.choice ?? "", probabilities, confidence: r.confidence ?? 0 };
    } else {
      out[id] = {
        type: "score",
        score: Object.entries(probabilities).reduce((s, [k, p]) => s + Number(k) * p, 0),
        legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), c])),
        probabilities,
        confidence: r.confidence ?? 0,
      };
    }
  }
  return out;
}

function normalize(p: Record<string, number>) {
  const total = Object.values(p).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v / total]));
}
