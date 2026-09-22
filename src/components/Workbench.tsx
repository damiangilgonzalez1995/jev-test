"use client";

import { useEffect, useState } from "react";
import { parseState, type Example, type Question } from "@/lib/types";
import { PROVIDERS } from "@/lib/providers";
import { QuestionEditor } from "@/components/QuestionEditor";
import { IdleRace, LiveRace, type Race } from "@/components/LiveRace";

type Props = {
  example: Example;
  state: string;
  onStateChange: (s: string) => void;
  questions: Record<string, Question>;
  onQuestionsChange: (q: Record<string, Question>) => void;
  race: Race | null;
  onRun: () => void;
  running: boolean;
  canRun: boolean;
};

export function Workbench({
  example,
  state,
  onStateChange,
  questions,
  onQuestionsChange,
  race,
  onRun,
  running,
  canRun,
}: Props) {
  const [view, setView] = useState<"cards" | "json">("cards");
  const { url, model } = PROVIDERS.vercel;
  const edited = JSON.stringify(questions) !== JSON.stringify(example.questions);
  const requestJson = JSON.stringify(
    { model, state: parseState(state), questions },
    null,
    2,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canRun && !running) {
        e.preventDefault();
        onRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canRun, running, onRun]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
      <header className="flex items-start justify-between gap-6 border-b border-border px-10 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {example.title}
          </h1>
          <p className="mt-1 max-w-2xl text-fg-muted">{example.description}</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
          <ViewButton
            active={view === "cards"}
            onClick={() => setView("cards")}
            title="Con formato"
          >
            ≡
          </ViewButton>
          <ViewButton
            active={view === "json"}
            onClick={() => setView("json")}
            title="JSON de la petición"
          >
            {"</>"}
          </ViewButton>
        </div>
      </header>

      {race ? <LiveRace key={race.startedAt} race={race} /> : <IdleRace ids={Object.keys(questions)} />}

      {view === "json" ? (
        <div className="px-10 py-8">
          <div className="mb-2 flex items-center justify-between text-[13px] uppercase tracking-wider text-fg-dim">
            <span>Cuerpo de la petición</span>
            <span className="normal-case">POST {url}</span>
          </div>
          <pre className="overflow-auto rounded-md border border-border bg-bg p-5 text-sm leading-relaxed text-fg-muted">
            {requestJson}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 px-10 py-8 xl:grid-cols-[1.1fr_1fr]">
          <div className="flex min-w-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] uppercase tracking-wider text-fg-dim">
                Estado
              </div>
              <div className="flex gap-1">
                {example.samples.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => onStateChange(s.state)}
                    className={`rounded border px-2 py-0.5 text-[13px] transition-colors ${
                      s.state === state
                        ? "border-accent/50 bg-accent-soft text-accent"
                        : "border-border text-fg-muted hover:border-border-strong hover:text-fg"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <StateBox key={example.id} state={state} onChange={onStateChange} />
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] uppercase tracking-wider text-fg-dim">
                Preguntas · los outputs que quieres
              </div>
              {edited && (
                <button
                  type="button"
                  onClick={() => onQuestionsChange(example.questions)}
                  className="rounded border border-border px-2 py-0.5 text-[13px] text-fg-muted hover:text-fg"
                >
                  ↺ restaurar
                </button>
              )}
            </div>
            <QuestionEditor key={example.id} questions={questions} onChange={onQuestionsChange} />
          </div>
        </div>
      )}

      <footer className="sticky bottom-0 mt-auto flex items-center border-t border-border bg-bg-elev/95 px-10 py-5 backdrop-blur">
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun || running}
          className="relative flex items-center gap-2 overflow-hidden rounded-md border border-accent bg-accent px-5 py-2 text-sm font-semibold text-white transition-[opacity,transform] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {running && <span className="shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />}
          {running ? (
            <>
              <span className="pulse">●</span> Ejecutando…
            </>
          ) : (
            <>▶ Ejecutar</>
          )}
        </button>
        <span className="ml-3 text-[13px] text-fg-dim">Ctrl + Enter</span>
      </footer>
    </section>
  );
}

/** El estado plegado muestra unas líneas de vista previa; al abrirlo se puede editar. */
function StateBox({ state, onChange }: { state: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const lines = state.split("\n").length;
  return (
    <div
      className={`overflow-hidden rounded-md border bg-bg transition-[border-color] duration-300 ${
        open ? "border-accent/50" : "border-border hover:border-border-strong"
      }`}
    >
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <textarea
            value={state}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            tabIndex={open ? 0 : -1}
            className="block h-[420px] w-full resize-y bg-transparent p-4 text-sm leading-relaxed text-fg outline-none"
          />
        </div>
      </div>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="group relative block w-full text-left">
          <pre className="max-h-[132px] overflow-hidden whitespace-pre-wrap p-4 text-sm leading-relaxed text-fg-muted">{state}</pre>
          <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-bg to-transparent" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-t border-border px-4 py-2 text-[13px] text-fg-dim hover:text-accent"
      >
        <span>{open ? "Plegar" : `Ver y editar · ${lines} líneas`}</span>
        <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-bg-hover text-fg" : "text-fg-dim hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
