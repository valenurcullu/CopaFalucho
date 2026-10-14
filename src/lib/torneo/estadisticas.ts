import type { Evento, Jugador } from "@/domain/tipos";

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
