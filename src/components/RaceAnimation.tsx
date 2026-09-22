"use client";

import { useEffect, useRef, useState } from "react";

// Todo se deriva de un único reloj `t` (ms desde que se pulsa Reproducir).
const READ_MS = 1400; // ambos leen el correo
const JEV_THINK_MS = 700; // Jev puntúa todas las opciones a la vez
const WORD_MS = 850; // lo que tarda el LLM en cada palabra

const EMAIL = [
  "Asunto: ¡¡Has ganado un iPhone 17!!",
  "Haz clic aquí en las próximas 2 horas",
  "para reclamar tu premio. Solo pagas el envío.",
];

/** Cada paso del LLM: las palabras que duda y la que acaba eligiendo (la primera). */
const LLM_STEPS: { pick: string; others: [string, number][]; p: number }[] = [
  { pick: "{", p: 0.97, others: [["Claro", 0.02], ["El", 0.01]] },
  { pick: "spam:", p: 0.9, others: [["carpeta:", 0.06], ["riesgo:", 0.04]] },
  { pick: "sí,", p: 0.81, others: [["no,", 0.12], ["quizá,", 0.07]] },
  { pick: "carpeta:", p: 0.88, others: [["riesgo:", 0.08], ["}", 0.04]] },
  { pick: "spam,", p: 0.62, others: [["promos,", 0.3], ["entrada,", 0.08]] },
  { pick: "riesgo:", p: 0.93, others: [["}", 0.05], ["nota:", 0.02]] },
  { pick: "alto", p: 0.55, others: [["medio", 0.38], ["bajo", 0.07]] },
  { pick: "}", p: 0.99, others: [[",", 0.01]] },
];
const LLM_END = READ_MS + LLM_STEPS.length * WORD_MS;
const JEV_END = READ_MS + JEV_THINK_MS;

const JEV_QUESTIONS: { q: string; options: [string, number][] }[] = [
  { q: "¿Es spam?", options: [["sí", 0.98], ["no", 0.02]] },
  { q: "¿A qué carpeta va?", options: [["spam", 0.95], ["promos", 0.04], ["entrada", 0.01]] },
  { q: "¿Cuánto riesgo tiene?", options: [["alto", 0.9], ["medio", 0.08], ["bajo", 0.02]] },
];

function usePlayer(end: number) {
  const [t, setT] = useState(end); // estado final visible por defecto (también para capturas y sin JS)
  const [playing, setPlaying] = useState(false);
  const start = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      if (!start.current) start.current = now;
      const next = now - start.current;
      setT(Math.min(next, end));
      if (next < end) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, end]);

  const play = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(end);
      return;
    }
    start.current = 0;
    setT(0);
    setPlaying(true);
  };
  return { t, playing, play };
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function RaceAnimation() {
  const { t, playing, play } = usePlayer(LLM_END + 400);
  const reading = t < READ_MS;
  const fresh = t === LLM_END + 400 && !playing;

  const llmStep = Math.min(Math.floor((t - READ_MS) / WORD_MS), LLM_STEPS.length);
  const llmWritten = t < READ_MS ? 0 : Math.max(0, llmStep);
  const stepProgress = t < READ_MS ? 0 : ((t - READ_MS) % WORD_MS) / WORD_MS;
  const llmDone = t >= LLM_END;
  const jevDone = t >= JEV_END;
  const jevThinking = !reading && !jevDone;

  const caption = fresh
    ? "Pulsa «Reproducir» para ver cómo trabaja cada uno con el mismo correo."
    : reading
      ? "1 · Los dos leen el correo. Hasta aquí, trabajan igual."
      : !jevDone
        ? "2 · Jev mira todas las respuestas posibles a la vez y les pone nota. El LLM empieza a escribir…"
        : !llmDone
          ? `3 · Jev ya ha terminado. El LLM sigue escribiendo palabra a palabra y en cada una duda entre varias (palabra ${llmWritten + 1} de ${LLM_STEPS.length}).`
          : "4 · Mismo resultado, distinto trabajo: el LLM ha tenido que «pensar» 8 veces; Jev, una.";

  return (
    <div className="font-sans">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          {playing ? "Reproduciendo…" : fresh ? "▶ Reproducir" : "↺ Repetir"}
        </button>
        <p className="min-h-[2.5em] flex-1 text-[15px] text-fg" aria-live="polite">{caption}</p>
      </div>

      {/* El correo que leen los dos */}
      <div className="relative mb-5 overflow-hidden rounded-lg border border-border bg-bg p-4 font-mono text-[13px] leading-relaxed text-fg-muted">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-fg-dim">📧 el correo</div>
        {EMAIL.map((l) => (
          <div key={l}>{l}</div>
        ))}
        {reading && !fresh && (
          <div
            className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-accent/20 to-transparent"
            style={{ left: `${(t / READ_MS) * 110 - 15}%` }}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* LLM */}
        <Lane
          title="LLM normal"
          who="Como alguien que redacta: escribe una palabra, la relee y piensa la siguiente."
          color="info"
          time={fresh ? LLM_END - READ_MS + 600 : Math.max(0, Math.min(t, LLM_END))}
          passes={fresh ? LLM_STEPS.length : llmDone ? LLM_STEPS.length : reading ? 0 : llmWritten + 1}
          done={llmDone}
        >
          <div className="min-h-[3.5em] rounded-md border border-border bg-bg p-3 font-mono text-[14px] text-fg">
            {LLM_STEPS.slice(0, llmWritten).map((s, i) => (
              <span key={i} className="fade-up mr-1.5 inline-block">
                {s.pick}
              </span>
            ))}
            {!llmDone && !reading && <span className="pulse text-info">▍</span>}
          </div>
          <div className="mt-3 min-h-[92px]">
            {!reading && !llmDone && llmStep < LLM_STEPS.length && (
              <Candidates step={LLM_STEPS[llmStep]} progress={stepProgress} />
            )}
            {llmDone && (
              <p className="text-[13px] text-fg-muted">
                Ha escrito la respuesta en <strong className="text-fg">8 pasos</strong>, uno detrás de otro. Además, podría haber
                escrito cualquier cosa, y tu programa tiene que interpretar ese texto.
              </p>
            )}
          </div>
        </Lane>

        {/* Jev */}
        <Lane
          title="Jev"
          who="Como alguien que rellena un test: ve todas las casillas y marca a la vez."
          color="accent"
          time={fresh ? JEV_THINK_MS : Math.max(0, Math.min(t, JEV_END))}
          passes={fresh || jevDone ? 1 : jevThinking ? 1 : 0}
          done={jevDone}
        >
          <div className="space-y-3">
            {JEV_QUESTIONS.map((qq) => (
              <div key={qq.q}>
                <div className="mb-1 text-[13px] font-semibold text-fg">{qq.q}</div>
                <div className="space-y-1">
                  {qq.options.map(([o, p], i) => {
                    const fill = jevDone || fresh ? p : jevThinking ? p * ((t - READ_MS) / JEV_THINK_MS) : 0;
                    const winner = i === 0 && (jevDone || fresh);
                    return (
                      <div key={o} className="flex items-center gap-2 text-[12px]">
                        <span className={`w-14 shrink-0 ${winner ? "font-semibold text-accent" : "text-fg-muted"}`}>{o}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-hover">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${fill * 100}%`, opacity: winner ? 1 : 0.4 }} />
                        </div>
                        <span className="w-9 text-right tabular-nums text-fg-muted">{Math.round(fill * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Lane>
      </div>
    </div>
  );
}

function Lane({
  title,
  who,
  color,
  time,
  passes,
  done,
  children,
}: {
  title: string;
  who: string;
  color: "info" | "accent";
  time: number;
  passes: number;
  done: boolean;
  children: React.ReactNode;
}) {
  const text = color === "info" ? "text-info" : "text-accent";
  const border = done ? (color === "info" ? "border-info/50" : "border-accent/50") : "border-border";
  return (
    <div className={`rounded-xl border-2 bg-bg-panel p-4 transition-colors ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-base font-bold ${text}`}>{title}</div>
          <div className="text-[13px] text-fg-muted">{who}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-xl tabular-nums text-fg">{secs(time)}</div>
          <div className="text-[12px] text-fg-dim">
            {passes} {passes === 1 ? "vez pensando" : "veces pensando"}
            {done && " ✓"}
          </div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Las palabras entre las que duda el LLM en este paso; la elegida se ilumina al final del paso. */
function Candidates({ step, progress }: { step: (typeof LLM_STEPS)[number]; progress: number }) {
  const all: [string, number][] = [[step.pick, step.p], ...step.others];
  const grow = Math.min(progress / 0.6, 1);
  const chosen = progress > 0.7;
  return (
    <div>
      <div className="mb-1 text-[12px] text-fg-dim">¿Qué palabra va ahora? Duda entre…</div>
      <div className="space-y-1">
        {all.map(([w, p], i) => (
          <div key={w} className="flex items-center gap-2 text-[12px]">
            <span className={`w-20 shrink-0 font-mono ${chosen && i === 0 ? "font-semibold text-info" : "text-fg-muted"}`}>{w}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-hover">
              <div className="h-full rounded-full bg-info" style={{ width: `${p * grow * 100}%`, opacity: chosen && i !== 0 ? 0.25 : 0.8 }} />
            </div>
            <span className="w-9 text-right tabular-nums text-fg-muted">{Math.round(p * grow * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
