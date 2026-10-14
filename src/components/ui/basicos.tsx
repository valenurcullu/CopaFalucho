import type { ReactNode } from "react";

export function Tarjeta({ children, className = "", as: Etiqueta = "div" }: { children: ReactNode; className?: string; as?: "div" | "article" | "section" | "li" }) {
  return <Etiqueta className={`rounded-2xl bg-superficie ring-1 ring-borde ${className}`}>{children}</Etiqueta>;
}

export function TituloPagina({ children, bajada }: { children: ReactNode; bajada?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="font-titulos text-3xl font-extrabold uppercase tracking-wide">{children}</h1>
      {bajada && <p className="text-sm text-texto-suave">{bajada}</p>}
    </header>
  );
}

export function TituloSeccion({ children, id, extra }: { children: ReactNode; id?: string; extra?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-baseline justify-between gap-2 first:mt-0">
      <h2 id={id} className="font-titulos text-xl font-bold uppercase tracking-wide">
        {children}
      </h2>
      {extra}
    </div>
  );
}

/** Indicador de partido en juego: bien visible y con animación suave. */
export function EnVivo({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-vivo font-bold uppercase tracking-wider text-vivo-texto ${
        grande ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      En juego
    </span>
  );
}

export function Insignia({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-superficie-alt px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-texto-suave ${className}`}>
      {children}
    </span>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-texto-suave">{children}</p>;
}

/** Bloque gris animado para los estados de carga. */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-superficie-alt ${className}`} />;
}

export function EsqueletoLista({ filas = 4 }: { filas?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      <Esqueleto className="h-8 w-40" />
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} className="h-28" />
      ))}
    </div>
  );
}
