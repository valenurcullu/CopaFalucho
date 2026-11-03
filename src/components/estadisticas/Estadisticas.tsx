"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Tarjeta as Caja, Vacio } from "@/components/ui/basicos";
import { IconoPelota, Tarjeta } from "@/components/ui/iconos";

export interface FilaStat {
  posicion: number;
  jugadorId: string;
  nombre: string;
  numero: number | null;
  equipo: string;
  goles?: number;
  amarillas?: number;
  rojas?: number;
}

const VISIBLES = 15;

function Lista({ filas, conFichas, valor }: { filas: FilaStat[]; conFichas: boolean; valor: (f: FilaStat) => ReactNode }) {
  const [todas, setTodas] = useState(false);
  const visibles = todas ? filas : filas.slice(0, VISIBLES);
  if (filas.length === 0) return <Vacio>Todavía no hay datos.</Vacio>;
  return (
    <Caja>
      <ol>
        {visibles.map((f, i) => {
          const repetida = i > 0 && visibles[i - 1].posicion === f.posicion;
          const contenido = (
            <>
              <span className={`w-7 shrink-0 text-center font-titulos text-lg font-bold ${f.posicion <= 3 ? "text-enlace" : "text-texto-suave"}`}>
                {repetida ? "" : f.posicion}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{f.nombre}</span>
                <span className="block truncate text-xs text-texto-suave">
                  {f.equipo}
                  {f.numero !== null && ` · #${f.numero}`}
                </span>
              </span>
              {valor(f)}
            </>
          );
          return (
            <li key={f.jugadorId} className="border-b border-borde last:border-0">
              {conFichas ? (
                <Link href={`/jugadores/${f.jugadorId}`} prefetch={false} className="flex min-h-14 items-center gap-3 px-3 active:bg-superficie-alt">
                  {contenido}
                </Link>
              ) : (
                <div className="flex min-h-14 items-center gap-3 px-3">{contenido}</div>
              )}
            </li>
          );
        })}
      </ol>
      {filas.length > VISIBLES && (
        <button type="button" onClick={() => setTodas(!todas)} className="min-h-12 w-full border-t border-borde text-sm font-semibold text-enlace">
          {todas ? "Ver menos" : `Ver los ${filas.length}`}
        </button>
      )}
    </Caja>
  );
}

export interface FilaSancion {
  jugadorId: string;
  nombre: string;
  equipo: string;
  motivo: string;
  /** "vs. Clase 2003 · sáb 5/12", o null si el próximo partido no está en el fixture. */
  cumpleEn: string | null;
  cumplida: boolean;
}

function ListaSanciones({ filas, conFichas }: { filas: FilaSancion[]; conFichas: boolean }) {
  const pendientes = filas.filter((f) => !f.cumplida);
  const cumplidas = filas.filter((f) => f.cumplida);
  const item = (f: FilaSancion, i: number) => {
    const contenido = (
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{f.nombre}</span>
        <span className="block text-xs text-texto-suave">
          {f.equipo} · {f.motivo}
        </span>
        <span className={`block text-xs font-semibold ${f.cumplida ? "text-texto-suave" : "text-secundario"}`}>
          {f.cumplida ? "Cumplida" : f.cumpleEn ? `No juega ${f.cumpleEn}` : "No juega el próximo partido"}
        </span>
      </span>
    );
    return (
      <li key={`${f.jugadorId}-${i}`} className="border-b border-borde last:border-0">
        {conFichas ? (
          <Link href={`/jugadores/${f.jugadorId}`} prefetch={false} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-superficie-alt">
            {contenido}
          </Link>
        ) : (
          <div className="flex min-h-16 items-center gap-3 px-4 py-2">{contenido}</div>
        )}
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      {pendientes.length === 0 ? <Vacio>No hay jugadores suspendidos para el próximo partido.</Vacio> : <Caja><ul>{pendientes.map(item)}</ul></Caja>}
      {cumplidas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-texto-suave">Ya cumplidas</h2>
          <Caja>
            <ul>{cumplidas.map(item)}</ul>
          </Caja>
        </section>
      )}
      <p className="text-xs text-texto-suave">
        Según el reglamento: 3 amarillas o doble amarilla, 1 fecha (las amarillas se limpian en semis). La roja directa la define la comisión.
      </p>
    </div>
  );
}

export function Estadisticas({
  goleadores,
  tarjetas,
  sanciones,
  conFichas,
}: {
  goleadores: FilaStat[];
  tarjetas: FilaStat[];
  sanciones: FilaSancion[];
  conFichas: boolean;
}) {
  const [vista, setVista] = useState<"goles" | "tarjetas" | "sanciones">("goles");
  return (
    <div>
      <div role="tablist" aria-label="Estadísticas" className="mb-4 grid grid-cols-3 rounded-full bg-superficie-alt p-1">
        {(
          [
            ["goles", "Goleadores"],
            ["tarjetas", "Tarjetas"],
            ["sanciones", "Sanciones"],
          ] as const
        ).map(([id, titulo]) => (
          <button
            key={id}
            role="tab"
            id={`pestania-${id}`}
            aria-selected={vista === id}
            aria-controls={`panel-${id}`}
            onClick={() => setVista(id)}
            className={`min-h-11 rounded-full text-sm font-semibold transition-colors ${vista === id ? "bg-superficie text-texto shadow-sm" : "text-texto-suave"}`}
          >
            {titulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${vista}`} aria-labelledby={`pestania-${vista}`}>
        {vista === "sanciones" ? (
          <ListaSanciones filas={sanciones} conFichas={conFichas} />
        ) : vista === "goles" ? (
          <Lista
            filas={goleadores}
            conFichas={conFichas}
            valor={(f) => (
              <span className="flex items-center gap-1.5 font-titulos text-2xl font-extrabold tabular-nums">
                {f.goles}
                <IconoPelota className="size-4" />
              </span>
            )}
          />
        ) : (
          <Lista
            filas={tarjetas}
            conFichas={conFichas}
            valor={(f) => (
              <span className="flex items-center gap-3 font-titulos text-xl font-bold tabular-nums">
                <span className={`flex items-center gap-1 ${f.rojas ? "" : "opacity-30"}`} aria-label={`${f.rojas} rojas`}>
                  <Tarjeta tipo="roja" /> {f.rojas}
                </span>
                <span className={`flex items-center gap-1 ${f.amarillas ? "" : "opacity-30"}`} aria-label={`${f.amarillas} amarillas`}>
                  <Tarjeta tipo="amarilla" /> {f.amarillas}
                </span>
              </span>
            )}
          />
        )}
      </div>
    </div>
  );
}
