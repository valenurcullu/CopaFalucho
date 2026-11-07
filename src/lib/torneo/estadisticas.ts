import type { Evento, Jugador } from "@/domain/tipos";
import type { Marcador } from "./marcador";

export interface FilaGoleador {
  posicion: number;
  jugadorId: string;
  equipoId: string;
  goles: number;
}

export interface FilaTarjetas {
  posicion: number;
  jugadorId: string;
  equipoId: string;
  rojas: number;
  amarillas: number;
}

/** Posiciones compartidas: 1, 1, 3, 4, 4… */
function conPosiciones<T>(ordenada: T[], igual: (a: T, b: T) => boolean): (T & { posicion: number })[] {
  return ordenada.map((fila, i) => {
    let primero = i;
    while (primero > 0 && igual(ordenada[primero - 1], fila)) primero--;
    return { ...fila, posicion: primero + 1 };
  });
}

const porNombre = (jugadores: Map<string, Jugador>) => (a: { jugadorId: string }, b: { jugadorId: string }) =>
  (jugadores.get(a.jugadorId)?.nombre ?? "").localeCompare(jugadores.get(b.jugadorId)?.nombre ?? "", "es");

/** Goleadores. Los goles en contra no suman para el jugador que los hizo. */
export function tablaGoleadores(eventos: readonly Evento[], jugadores: readonly Jugador[]): FilaGoleador[] {
  const indice = new Map(jugadores.map((j) => [j.id, j]));
  const goles = new Map<string, number>();
  for (const e of eventos) {
    if (e.tipo === "gol" && e.jugadorId) goles.set(e.jugadorId, (goles.get(e.jugadorId) ?? 0) + 1);
  }
  const filas = [...goles].map(([jugadorId, g]) => ({ jugadorId, equipoId: indice.get(jugadorId)?.equipoId ?? "", goles: g }));
  filas.sort((a, b) => b.goles - a.goles || porNombre(indice)(a, b));
  return conPosiciones(filas, (a, b) => a.goles === b.goles);
}

/** Tarjetas por jugador: primero las rojas, después las amarillas. */
export function tablaTarjetas(eventos: readonly Evento[], jugadores: readonly Jugador[]): FilaTarjetas[] {
  const indice = new Map(jugadores.map((j) => [j.id, j]));
  const conteo = new Map<string, { rojas: number; amarillas: number }>();
  for (const e of eventos) {
    if ((e.tipo !== "amarilla" && e.tipo !== "roja") || !e.jugadorId) continue;
    const c = conteo.get(e.jugadorId) ?? { rojas: 0, amarillas: 0 };
    if (e.tipo === "roja") c.rojas++;
    else c.amarillas++;
    conteo.set(e.jugadorId, c);
  }
  const filas = [...conteo].map(([jugadorId, c]) => ({ jugadorId, equipoId: indice.get(jugadorId)?.equipoId ?? "", ...c }));
  filas.sort((a, b) => b.rojas - a.rojas || b.amarillas - a.amarillas || porNombre(indice)(a, b));
  return conPosiciones(filas, (a, b) => a.rojas === b.rojas && a.amarillas === b.amarillas);
}

export interface EstadisticasJugador {
  goles: number;
  amarillas: number;
  rojas: number;
}

export function estadisticasPorJugador(eventos: readonly Evento[]): Map<string, EstadisticasJugador> {
  const mapa = new Map<string, EstadisticasJugador>();
  for (const e of eventos) {
    if (!e.jugadorId || e.tipo === "gol_en_contra") continue;
    const s = mapa.get(e.jugadorId) ?? { goles: 0, amarillas: 0, rojas: 0 };
    if (e.tipo === "gol") s.goles++;
    else if (e.tipo === "amarilla") s.amarillas++;
    else s.rojas++;
    mapa.set(e.jugadorId, s);
  }
  return mapa;
}

export interface EstadisticasEquipo {
  /** Partidos finalizados en todo el torneo (zonas y fase final). */
  pj: number;
  gf: number;
  gc: number;
  /** Partidos terminados sin goles en contra. */
  vallasInvictas: number;
  amarillas: number;
  rojas: number;
}

export const ESTADISTICAS_EQUIPO_VACIAS: EstadisticasEquipo = { pj: 0, gf: 0, gc: 0, vallasInvictas: 0, amarillas: 0, rojas: 0 };

interface PartidoConMarcador {
  estado: string;
  localId: string | null;
  visitanteId: string | null;
  marcador: Marcador | null;
}

/**
 * Números de cada equipo en todo el torneo. Los goles salen del resultado del
 * partido (los penales de una definición no cuentan) y las tarjetas, de Eventos.
 */
export function estadisticasPorEquipo(
  equipoIds: readonly string[],
  partidos: readonly PartidoConMarcador[],
  eventos: readonly Evento[],
): Record<string, EstadisticasEquipo> {
  const stats: Record<string, EstadisticasEquipo> = Object.fromEntries(equipoIds.map((id) => [id, { ...ESTADISTICAS_EQUIPO_VACIAS }]));
  for (const p of partidos) {
    if (p.estado !== "finalizado" || !p.marcador || !p.localId || !p.visitanteId) continue;
    for (const [id, propios, ajenos] of [
      [p.localId, p.marcador.local, p.marcador.visitante],
      [p.visitanteId, p.marcador.visitante, p.marcador.local],
    ] as const) {
      const s = stats[id];
      if (!s) continue;
      s.pj++;
      s.gf += propios;
      s.gc += ajenos;
      if (ajenos === 0) s.vallasInvictas++;
    }
  }
  for (const e of eventos) {
    const s = stats[e.equipoId];
    if (!s) continue;
    if (e.tipo === "amarilla") s.amarillas++;
    else if (e.tipo === "roja") s.rojas++;
  }
  return stats;
}

/** Qué número extra mostrar según la posición: promedio de gol o vallas invictas. */
export type DatoPorPosicion = "promedio" | "vallas" | null;

export function datoPorPosicion(posicion: string | null): DatoPorPosicion {
  const p = (posicion ?? "").toLowerCase();
  if (p.startsWith("delantero") || p.startsWith("mediocampista")) return "promedio";
  if (p.startsWith("arquero") || p.startsWith("defensor")) return "vallas";
  return null;
}

/**
 * Goles por partido. Como la planilla no dice quién jugó cada partido, se
 * divide por los partidos que jugó su equipo.
 */
export function promedioGol(goles: number, partidosDelEquipo: number): number | null {
  return partidosDelEquipo > 0 ? goles / partidosDelEquipo : null;
}
