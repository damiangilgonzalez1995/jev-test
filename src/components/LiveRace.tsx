"use client";

import { useEffect, useRef, useState } from "react";

export type LaneResult = {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  firstTokenMs?: number | null;
  reasoningTokens?: number;
};

export type Race = {
  startedAt: number;
  ids: string[];
  llmModel: string;
  jev?: LaneResult | "error";
  llm?: LaneResult | "error";
  /** El JSON que OpenAI va escribiendo, tal como llega en streaming. */
  llmText?: string;
};

/** Cronómetro que avanza mientras alguna carril siga pendiente. */
function useElapsed(race: Race) {
  const pending = !race.jev || !race.llm;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pending) return;
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pending]);
  return now - race.startedAt;
}

const fmtMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const fmtUsd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(2)}`);

export function LiveRace({ race }: { race: Race }) {
  const elapsed = useElapsed(race);
  const jev = typeof race.jev === "object" ? race.jev : undefined;
  const llm = typeof race.llm === "object" ? race.llm : undefined;

  return (
    <section className="fade-up border-b border-border bg-bg-elev px-10 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[13px] uppercase tracking-wider text-fg-dim">Carrera en directo · mismo estado, mismas preguntas</h2>
        <span className="text-[13px] text-fg-dim">{race.ids.length} outputs</span>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Lane
          title="Jev"
          subtitle="lee una vez · responde todo en paralelo"
          tone="accent"
          elapsed={jev?.latencyMs ?? elapsed}
          state={race.jev}
        >
          <ParallelDiagram ids={race.ids} done={!!race.jev} />
        </Lane>
        <Lane
          title={race.llmModel}
          subtitle="escribe el JSON token a token (razonamiento desactivado)"
          tone="info"
          elapsed={llm?.latencyMs ?? elapsed}
          state={race.llm}
        >
          <LiveJson text={race.llmText ?? ""} elapsed={elapsed} result={llm} done={!!race.llm} />
        </Lane>
      </div>

      {jev && llm && <Metrics jev={jev} llm={llm} llmModel={race.llmModel} />}
    </section>
  );
}

function Lane({
  title,
  subtitle,
  tone,
  elapsed,
  state,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "accent" | "info";
  elapsed: number;
  state: LaneResult | "error" | undefined;
  children: React.ReactNode;
}) {
  const color = tone === "accent" ? "text-accent" : "text-info";
  return (
    <div className="rounded-lg border border-border bg-bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-sm font-semibold ${color}`}>{title}</div>
          <div className="text-[12px] text-fg-dim">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-2xl tabular-nums ${state ? "text-fg" : color}`}>{fmtMs(elapsed)}</div>
          <div className="text-[12px] text-fg-dim">
            {state === "error" ? <span className="text-bad">error</span> : state ? "✓ terminado" : <span className="pulse">● pensando</span>}
          </div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Un nodo «estado» del que salen todas las preguntas a la vez. */
function ParallelDiagram({ ids, done }: { ids: string[]; done: boolean }) {
  const shown = ids.slice(0, 10);
  const rowH = 22;
  const h = Math.max(shown.length * rowH, 60);
  return (
    <svg viewBox={`0 0 420 ${h}`} className="w-full" role="img" aria-label="Jev responde todas las preguntas en paralelo">
      <rect x={4} y={h / 2 - 16} width={78} height={32} rx={8} fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={43} y={h / 2 + 4} textAnchor="middle" fontSize={11} fill="var(--fg)">estado</text>
      {shown.map((id, i) => {
        const y = i * rowH + rowH / 2;
        return (
          <g key={id}>
            <path
              d={`M82 ${h / 2} C 130 ${h / 2}, 130 ${y}, 178 ${y}`}
              fill="none"
              stroke="var(--accent)"
              strokeOpacity={done ? 0.35 : 0.8}
              className={done ? undefined : "flow"}
            />
            <rect x={180} y={y - 8} width={150} height={16} rx={8} fill="var(--bg-hover)" />
            <rect
              x={180}
              y={y - 8}
              width={done ? 150 : 0}
              height={16}
              rx={8}
              fill="var(--ok)"
              fillOpacity={0.25}
              style={{ transition: "width 450ms cubic-bezier(.2,.8,.2,1)" }}
            />
            <text x={188} y={y + 4} fontSize={10.5} fill="var(--fg)">{id}</text>
            <text x={338} y={y + 4} fontSize={11} fill={done ? "var(--ok)" : "var(--fg-dim)"}>{done ? "✓" : "…"}</text>
          </g>
        );
      })}
      {ids.length > shown.length && (
        <text x={400} y={h - 4} textAnchor="end" fontSize={10} fill="var(--fg-dim)">+{ids.length - shown.length}</text>
      )}
    </svg>
  );
}

/** El JSON real de OpenAI apareciendo en directo. Antes de la primera letra, el modelo razona en privado. */
function LiveJson({
  text,
  elapsed,
  result,
  done,
}: {
  text: string;
  elapsed: number;
  result?: LaneResult;
  done: boolean;
}) {
  const box = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [text]);

  const thinkingMs = result?.firstTokenMs ?? (text ? undefined : elapsed);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[12px]">
        <span className={`rounded-full px-2 py-0.5 ${!text && !done ? "bg-info-soft text-info" : "bg-bg-hover text-fg-dim"}`}>
          {!text && !done ? <span className="pulse">● esperando la primera letra</span> : "1 · primera letra"}
          {thinkingMs !== undefined && ` · ${fmtMs(thinkingMs)}`}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${text && !done ? "bg-info-soft text-info" : "bg-bg-hover text-fg-dim"}`}>
          {text && !done ? <span className="pulse">● escribiendo JSON</span> : "2 · escribe el JSON"}
        </span>
      </div>
      <pre
        ref={box}
        className="h-[150px] overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-bg p-3 font-mono text-[12px] leading-relaxed text-fg"
      >
        {text || (
          <span className="text-fg-dim">
            {done ? "sin respuesta" : "Conectando con el modelo…"}
          </span>
        )}
        {text && !done && <span className="pulse text-info">▍</span>}
      </pre>
      <div className="mt-2 text-[12px] text-fg-dim">
        {result
          ? result.reasoningTokens
            ? `${result.outputTokens} tokens de salida: ${result.reasoningTokens} razonando (ocultos) + ${
                result.outputTokens - result.reasoningTokens
              } de JSON visible`
            : `${result.outputTokens} tokens de salida, todos visibles arriba`
          : `${text.length} caracteres recibidos`}
      </div>
    </div>
  );
}

function Metrics({ jev, llm, llmModel }: { jev: LaneResult; llm: LaneResult; llmModel: string }) {
  const speed = llm.latencyMs / Math.max(jev.latencyMs, 1);
  const cheaper = jev.costUsd > 0 ? llm.costUsd / jev.costUsd : Infinity;
  const rows: { label: string; jev: string; llm: string; winner: "jev" | "llm" | null }[] = [
    { label: "Tiempo", jev: fmtMs(jev.latencyMs), llm: fmtMs(llm.latencyMs), winner: jev.latencyMs <= llm.latencyMs ? "jev" : "llm" },
    { label: "Tokens de entrada", jev: String(jev.inputTokens), llm: String(llm.inputTokens), winner: null },
    { label: "Tokens de salida", jev: String(jev.outputTokens), llm: String(llm.outputTokens), winner: jev.outputTokens <= llm.outputTokens ? "jev" : "llm" },
    { label: "Coste de esta llamada", jev: fmtUsd(jev.costUsd), llm: fmtUsd(llm.costUsd), winner: jev.costUsd <= llm.costUsd ? "jev" : "llm" },
    { label: "Coste × 1 millón de llamadas", jev: fmtUsd(jev.costUsd * 1e6), llm: fmtUsd(llm.costUsd * 1e6), winner: jev.costUsd <= llm.costUsd ? "jev" : "llm" },
  ];
  return (
    <div className="fade-up mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[12px] uppercase tracking-wider text-fg-dim">
            <th className="pb-2 text-left font-normal"></th>
            <th className="pb-2 text-right font-normal text-accent">Jev</th>
            <th className="pb-2 text-right font-normal text-info">{llmModel}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <td className="py-1.5 text-fg-muted">{r.label}</td>
              <td className={`py-1.5 text-right ${r.winner === "jev" ? "font-semibold text-ok" : "text-fg"}`}>{r.jev}</td>
              <td className={`py-1.5 text-right ${r.winner === "llm" ? "font-semibold text-ok" : "text-fg"}`}>{r.llm}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 lg:flex-col">
        <Stat n={speed >= 1 ? speed : 1 / speed} digits={1} label={speed >= 1 ? "más rápido" : "más lento"} />
        <Stat n={cheaper} digits={0} label="más barato" />
      </div>
    </div>
  );
}

/** Anima un número desde 0 hasta su valor final. */
function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = reduce ? 1 : Math.min((now - t0) / ms, 1);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Stat({ n, digits, label }: { n: number; digits: number; label: string }) {
  const v = useCountUp(n);
  return (
    <div className="fade-up flex-1 rounded-lg border border-ok/30 bg-ok-soft px-5 py-3 text-center">
      <div className="text-3xl font-semibold tabular-nums text-ok">{Number.isFinite(n) ? `${v.toFixed(digits)}×` : "∞"}</div>
      <div className="text-[12px] text-fg-muted">Jev · {label}</div>
    </div>
  );
}

/** Vista previa en espera: la carrera ya se mueve antes de pulsar Ejecutar. */
export function IdleRace({ ids }: { ids: string[] }) {
  return (
    <section className="border-b border-border bg-bg-elev px-10 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[13px] uppercase tracking-wider text-fg-dim">La carrera · Jev frente a un LLM</h2>
        <span className="text-[13px] text-fg-dim">pulsa Ejecutar para empezar</span>
      </div>
      <div className="grid grid-cols-1 gap-4 opacity-80 2xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-panel p-4">
          <div className="text-sm font-semibold text-accent">Jev</div>
          <div className="mb-3 text-[12px] text-fg-dim">lee una vez · responde todo en paralelo</div>
          <ParallelDiagram ids={ids} done={false} />
        </div>
        <div className="rounded-lg border border-border bg-bg-panel p-4">
          <div className="text-sm font-semibold text-info">LLM</div>
          <div className="mb-3 text-[12px] text-fg-dim">genera token a token</div>
          <div className="flex flex-wrap gap-[3px]">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="pulse h-[8px] w-[8px] rounded-[2px] bg-info" style={{ animationDelay: `${i * 60}ms`, opacity: 0.5 }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
