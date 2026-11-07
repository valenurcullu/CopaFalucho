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
        Según el reglamento: 3 amarillas o doble amarilla, 1 fecha (las amarillas se limpian en semis). En la roja directa, las fechas las define la comisión.
      </p>
    </div>
  );
}

export interface FilaEquipoStat {
  id: string;
  nombre: string;
  pj: number;
  gf: number;
  gc: number;
  vallasInvictas: number;
  amarillas: number;
  rojas: number;
}

type Columna = "gf" | "gc" | "vallasInvictas" | "amarillas" | "rojas";

/** Cómo ordena cada columna: los goles en contra y las tarjetas, de menos a más. */
const COLUMNAS: { id: Columna; titulo: ReactNode; etiqueta: string; ascendente: boolean }[] = [
  { id: "gf", titulo: "GF", etiqueta: "Goles a favor", ascendente: false },
  { id: "gc", titulo: "GC", etiqueta: "Goles en contra", ascendente: true },
  { id: "vallasInvictas", titulo: "VI", etiqueta: "Vallas invictas", ascendente: false },
  { id: "amarillas", titulo: <Tarjeta tipo="amarilla" />, etiqueta: "Amarillas", ascendente: true },
  { id: "rojas", titulo: <Tarjeta tipo="roja" />, etiqueta: "Rojas", ascendente: true },
];

function TablaEquipos({ filas }: { filas: FilaEquipoStat[] }) {
  const [orden, setOrden] = useState<Columna>("gf");
  const jugados = filas.filter((f) => f.pj > 0);
  if (jugados.length === 0) return <Vacio>Todavía no hay partidos jugados.</Vacio>;
  const columna = COLUMNAS.find((c) => c.id === orden)!;
  const ordenadas = [...jugados].sort(
    (a, b) => (columna.ascendente ? a[orden] - b[orden] : b[orden] - a[orden]) || a.nombre.localeCompare(b.nombre, "es"),
  );
  return (
    <div className="flex flex-col gap-2">
      <Caja className="overflow-hidden">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-borde text-xs text-texto-suave">
              <th scope="col" className="px-3 py-2 text-left font-semibold">Equipo</th>
              <th scope="col" className="w-9 font-semibold"><abbr title="Partidos jugados">PJ</abbr></th>
              {COLUMNAS.map((c) => (
                <th key={c.id} scope="col" className="w-10" aria-sort={orden === c.id ? (c.ascendente ? "ascending" : "descending") : undefined}>
                  <button
                    type="button"
                    onClick={() => setOrden(c.id)}
                    aria-label={`Ordenar por ${c.etiqueta.toLowerCase()}`}
                    className={`flex min-h-10 w-full items-center justify-center font-semibold ${orden === c.id ? "text-enlace underline underline-offset-4" : ""}`}
                  >
                    {c.titulo}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((f) => (
              <tr key={f.id} className="border-b border-borde last:border-0">
                <th scope="row" className="max-w-0 truncate px-3 py-2.5 text-left font-semibold">
                  <Link href={`/equipos/${f.id}`} prefetch={false}>{f.nombre}</Link>
                </th>
                <td className="text-center text-texto-suave">{f.pj}</td>
                {COLUMNAS.map((c) => (
                  <td key={c.id} className={`text-center ${orden === c.id ? "font-bold" : ""}`}>{f[c.id]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Caja>
      <p className="text-xs text-texto-suave">GF: goles a favor · GC: goles en contra · VI: vallas invictas. Tocá una columna para ordenar.</p>
    </div>
  );
}

export function Estadisticas({
  goleadores,
  tarjetas,
  sanciones,
  equipos,
  conFichas,
}: {
  goleadores: FilaStat[];
  tarjetas: FilaStat[];
  sanciones: FilaSancion[];
  equipos: FilaEquipoStat[];
  conFichas: boolean;
}) {
  const [vista, setVista] = useState<"goles" | "tarjetas" | "equipos" | "sanciones">("goles");
  return (
    <div>
      <div role="tablist" aria-label="Estadísticas" className="mb-4 grid grid-cols-4 rounded-full bg-superficie-alt p-1">
        {(
          [
            ["goles", "Goleadores"],
            ["tarjetas", "Tarjetas"],
            ["equipos", "Equipos"],
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
        {vista === "equipos" ? (
          <TablaEquipos filas={equipos} />
        ) : vista === "sanciones" ? (
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
