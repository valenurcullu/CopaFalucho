"use client";

import { useId, useState, type ReactNode } from "react";

export interface Pestania {
  id: string;
  titulo: ReactNode;
  contenido: ReactNode;
}

/** Botones tipo segmento que muestran un contenido u otro (el resto queda oculto). */
export function Pestanias({ pestanias, etiqueta }: { pestanias: Pestania[]; etiqueta: string }) {
  const [activa, setActiva] = useState(pestanias[0]?.id);
  const base = useId();
  return (
    <div>
      <div
        role="tablist"
        aria-label={etiqueta}
        className="mb-4 grid rounded-full bg-superficie-alt p-1"
        style={{ gridTemplateColumns: `repeat(${pestanias.length}, minmax(0, 1fr))` }}
      >
        {pestanias.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`${base}-pestania-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`${base}-panel-${p.id}`}
            onClick={() => setActiva(p.id)}
            className={`min-h-11 rounded-full text-sm font-semibold transition-colors ${
              activa === p.id ? "bg-superficie text-marca shadow-sm" : "text-texto-suave"
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>
      {pestanias.map((p) => (
        <div key={p.id} role="tabpanel" id={`${base}-panel-${p.id}`} aria-labelledby={`${base}-pestania-${p.id}`} hidden={activa !== p.id}>
          {p.contenido}
        </div>
      ))}
    </div>
  );
}
