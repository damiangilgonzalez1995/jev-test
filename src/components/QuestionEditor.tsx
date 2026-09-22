"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";

type Props = {
  questions: Record<string, Question>;
  onChange: (q: Record<string, Question>) => void;
};

const TYPES: { type: Question["type"]; label: string; hint: string; style: string }[] = [
  { type: "noul", label: "noul", hint: "¿sí o no? → una probabilidad 0..1", style: "text-info border-info/40 bg-info-soft" },
  { type: "choice", label: "choice", hint: "¿cuál? → una opción de tu lista", style: "text-accent border-accent/40 bg-accent-soft" },
  { type: "score", label: "score", hint: "¿cuánto? → un nivel de tu escala", style: "text-ok border-ok/40 bg-ok-soft" },
];

const input =
  "w-full rounded border border-border bg-bg px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-strong";
const label = "mb-1 block text-[12px] uppercase tracking-wider text-fg-dim";
const iconBtn = "shrink-0 rounded border border-border px-2 text-fg-dim hover:border-bad/50 hover:text-bad";
const addBtn = "mt-1.5 text-[13px] text-fg-muted hover:text-accent";

/** Al cambiar de tipo, conserva las instrucciones y crea unos criteria de partida. */
function convert(q: Question, type: Question["type"]): Question {
  const { instructions } = q;
  if (type === "noul") return { type, instructions };
  if (type === "choice") {
    const criteria = q.type === "score" ? Object.fromEntries(q.criteria.map((c) => [c, null])) : { opcion_a: null, opcion_b: null };
    return { type, instructions, criteria };
  }
  const criteria = q.type === "choice" ? Object.keys(q.criteria) : ["bajo", "medio", "alto"];
  return { type, instructions, criteria };
}

export function QuestionEditor({ questions, onChange }: Props) {
  const entries = Object.entries(questions);
  const [open, setOpen] = useState<number | null>(null);

  // Reconstruye el mapa conservando el orden (las claves son los nombres de los outputs).
  const update = (index: number, id: string, q: Question | null) => {
    const next: Record<string, Question> = {};
    entries.forEach(([k, v], i) => {
      if (i !== index) next[k] = v;
      else if (q) next[id] = q;
    });
    onChange(next);
  };

  const add = () => {
    let n = entries.length + 1;
    while (`pregunta_${n}` in questions) n++;
    onChange({ ...questions, [`pregunta_${n}`]: { type: "noul", instructions: "" } });
    setOpen(entries.length);
  };

  return (
    <div className="space-y-2">
      {entries.map(([id, q], i) => (
        <div key={i} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
        <QuestionCard
          id={id}
          q={q}
          open={open === i}
          onToggle={() => setOpen(open === i ? null : i)}
          taken={(name) => name !== id && name in questions}
          onChange={(newId, newQ) => update(i, newId, newQ)}
          onRemove={() => {
            setOpen(null);
            update(i, id, null);
          }}
        />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full rounded-md border border-dashed border-border py-2.5 text-sm text-fg-muted hover:border-accent/50 hover:text-accent"
      >
        + Añadir pregunta
      </button>
    </div>
  );
}

/**
 * Campo para nombres (claves). Deja escribir libremente, incluso vaciarlo; solo guarda
 * los valores válidos y, al salir del campo, vuelve al último nombre válido si hace falta.
 */
function NameInput({
  value,
  isValid,
  onCommit,
  className,
}: {
  value: string;
  isValid: (name: string) => boolean;
  onCommit: (name: string) => void;
  className: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const ok = !!text && isValid(text);
  return (
    <input
      value={text}
      onChange={(e) => {
        const name = e.target.value.replace(/\s+/g, "_");
        setDraft(name);
        if (name && isValid(name)) onCommit(name);
      }}
      onBlur={() => setDraft(null)}
      spellCheck={false}
      aria-invalid={!ok}
      className={`${className} ${ok ? "" : "border-bad/60"}`}
    />
  );
}

function summary(q: Question) {
  if (q.type === "noul") return "sí / no";
  const opts = q.type === "choice" ? Object.keys(q.criteria) : q.criteria;
  return opts.join(" · ");
}

function QuestionCard({
  id,
  q,
  open,
  onToggle,
  taken,
  onChange,
  onRemove,
}: {
  id: string;
  q: Question;
  open: boolean;
  onToggle: () => void;
  taken: (name: string) => boolean;
  onChange: (id: string, q: Question) => void;
  onRemove: () => void;
}) {
  const instructions = typeof q.instructions === "string" ? q.instructions : JSON.stringify(q.instructions);
  const type = TYPES.find((t) => t.type === q.type);

  return (
    <div
      className={`overflow-hidden rounded-md border bg-bg-panel transition-[border-color,box-shadow] duration-300 ${
        open ? "border-accent/50 shadow-[0_6px_24px_-12px_rgba(210,96,31,0.35)]" : "border-border hover:border-border-strong"
      }`}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} className="group flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={`shrink-0 rounded border px-1.5 py-px text-[11px] uppercase ${type?.style}`}>{q.type}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{id}</span>
          <span className="block truncate text-[13px] text-fg-muted">{instructions || "sin instrucciones"}</span>
          {!open && <span className="block truncate text-[12px] text-fg-dim">{summary(q)}</span>}
        </span>
        <span
          className={`shrink-0 text-fg-dim transition-transform duration-300 group-hover:text-accent ${open ? "rotate-180 text-accent" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-border p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className={label}>Nombre del output (clave)</span>
          <NameInput value={id} isValid={(name) => !taken(name)} onCommit={(name) => onChange(name, q)} className={`${input} font-semibold`} />
        </div>
        <button type="button" onClick={onRemove} title="Eliminar pregunta" className={`${iconBtn} mt-5 py-1.5`}>
          ✕
        </button>
      </div>

      <div className="mt-3">
        <span className={label}>type</span>
        <div className="flex gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => t.type !== q.type && onChange(id, convert(q, t.type))}
              className={`rounded border px-2.5 py-1 text-[13px] uppercase transition-colors ${
                t.type === q.type ? t.style : "border-border text-fg-dim hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[12px] text-fg-dim">{type?.hint}</p>
      </div>

      <div className="mt-3">
        <span className={label}>instructions · qué quieres saber</span>
        <textarea
          value={instructions}
          onChange={(e) => onChange(id, { ...q, instructions: e.target.value })}
          rows={2}
          placeholder="p. ej. ¿Este correo es spam?"
          className={`${input} resize-y`}
        />
      </div>

      <div className="mt-3">
        {q.type === "noul" && <NoulCriteria q={q} onChange={(nq) => onChange(id, nq)} />}
        {q.type === "choice" && <ChoiceCriteria q={q} onChange={(nq) => onChange(id, nq)} />}
        {q.type === "score" && <ScoreCriteria q={q} onChange={(nq) => onChange(id, nq)} />}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white active:scale-[0.97]"
        >
          Listo
        </button>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoulCriteria({
  q,
  onChange,
}: {
  q: Extract<Question, { type: "noul" }>;
  onChange: (q: Question) => void;
}) {
  const set = (key: "true" | "false", value: string) => {
    const criteria = { ...q.criteria, [key]: value || undefined };
    const empty = !criteria.true && !criteria.false;
    onChange({ type: "noul", instructions: q.instructions, ...(empty ? {} : { criteria }) });
  };
  return (
    <>
      <span className={label}>criteria · opcional: qué cuenta como sí / no</span>
      <div className="space-y-1.5">
        {(["true", "false"] as const).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className={`w-12 shrink-0 text-[13px] ${k === "true" ? "text-ok" : "text-bad"}`}>{k}</span>
            <input
              value={q.criteria?.[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
              placeholder={k === "true" ? "cuándo responder «sí»" : "cuándo responder «no»"}
              className={input}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function ChoiceCriteria({
  q,
  onChange,
}: {
  q: Extract<Question, { type: "choice" }>;
  onChange: (q: Question) => void;
}) {
  const rows = Object.entries(q.criteria);
  const save = (next: [string, string | null][]) =>
    onChange({ ...q, criteria: Object.fromEntries(next) });

  return (
    <>
      <span className={label}>criteria · las únicas opciones posibles</span>
      <div className="space-y-1.5">
        {rows.map(([key, desc], i) => (
          <div key={i} className="flex gap-2">
            <NameInput
              value={key}
              isValid={(k) => !rows.some(([other], j) => j !== i && other === k)}
              onCommit={(k) => save(rows.map((r, j) => (j === i ? [k, desc] : r)))}
              className={`${input} w-[38%] shrink-0 font-semibold`}
            />
            <input
              value={desc ?? ""}
              onChange={(e) => save(rows.map((r, j) => (j === i ? [key, e.target.value || null] : r)))}
              placeholder="cuándo elegirla (opcional)"
              className={input}
            />
            <button
              type="button"
              onClick={() => rows.length > 2 && save(rows.filter((_, j) => j !== i))}
              disabled={rows.length <= 2}
              title="Mínimo dos opciones"
              className={`${iconBtn} disabled:opacity-30`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          let n = rows.length + 1;
          while (`opcion_${n}` in q.criteria) n++;
          save([...rows, [`opcion_${n}`, null]]);
        }}
        className={addBtn}
      >
        + opción
      </button>
    </>
  );
}

function ScoreCriteria({
  q,
  onChange,
}: {
  q: Extract<Question, { type: "score" }>;
  onChange: (q: Question) => void;
}) {
  const save = (criteria: string[]) => onChange({ ...q, criteria });
  const move = (i: number, d: number) => {
    const next = [...q.criteria];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next);
  };

  return (
    <>
      <span className={label}>criteria · escala ordenada de menor a mayor</span>
      <div className="space-y-1.5">
        {q.criteria.map((level, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-[13px] text-ok">{i}</span>
            <input value={level} onChange={(e) => save(q.criteria.map((c, j) => (j === i ? e.target.value : c)))} className={input} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Subir" className={`${iconBtn} disabled:opacity-30`}>
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === q.criteria.length - 1} title="Bajar" className={`${iconBtn} disabled:opacity-30`}>
              ↓
            </button>
            <button
              type="button"
              onClick={() => q.criteria.length > 2 && save(q.criteria.filter((_, j) => j !== i))}
              disabled={q.criteria.length <= 2}
              title="Mínimo dos niveles"
              className={`${iconBtn} disabled:opacity-30`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => save([...q.criteria, `nivel ${q.criteria.length}`])} className={addBtn}>
        + nivel
      </button>
    </>
  );
}
