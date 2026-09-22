"use client";

import Link from "next/link";
import { useState } from "react";
import type { Example } from "@/lib/types";

type Props = {
  examples: Example[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/** Lista de ejemplos que se pliega sola al elegir uno, para dejar sitio al trabajo. */
export function Sidebar({ examples, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const current = examples.find((e) => e.id === selectedId);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-bg-elev transition-[width] duration-300 ease-out ${
        open ? "w-[260px]" : "w-[56px]"
      }`}
    >
      {/* Franja plegada: acceso al blog, botón para abrir y el ejemplo actual en vertical */}
      <div
        className={`absolute inset-0 flex flex-col items-center gap-3 pt-4 transition-opacity duration-200 ${
          open ? "pointer-events-none opacity-0" : "opacity-100 delay-150"
        }`}
      >
        <Link
          href="/blog"
          title="Cómo funciona Jev"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white hover:opacity-90"
        >
          📖
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mostrar ejemplos"
          className="flex w-full flex-1 flex-col items-center gap-4 pt-2 text-fg-muted hover:bg-bg-hover hover:text-accent"
        >
          <span className="text-lg leading-none">☰</span>
          <span className="text-[13px] font-medium text-accent [writing-mode:vertical-rl]">{current?.title}</span>
        </button>
      </div>

      <div className={`flex h-full w-[260px] flex-col transition-opacity duration-200 ${open ? "opacity-100 delay-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex items-start justify-between gap-2 px-4 pb-4 pt-4">
          <Link
            href="/blog"
            className="flex flex-1 items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            📖 Cómo funciona Jev
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Plegar ejemplos"
            className="rounded px-2 py-2 text-fg-dim hover:bg-bg-hover hover:text-fg"
          >
            «
          </button>
        </div>

        <div className="px-6 pb-2 text-[12px] uppercase tracking-wider text-fg-dim">Ejemplos</div>
        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {examples.map((ex) => {
              const active = ex.id === selectedId;
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(ex.id);
                      setOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      active ? "bg-accent-soft font-medium text-accent" : "text-fg-muted hover:bg-bg-hover hover:text-fg"
                    }`}
                  >
                    {ex.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-6 py-4 text-[12px] text-fg-dim">
          Basado en{" "}
          <a href="https://github.com/davila7/jev-explained" target="_blank" rel="noreferrer" className="hover:text-fg">
            jev-explained
          </a>
        </div>
      </div>
    </aside>
  );
}
