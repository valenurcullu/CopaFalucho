import type { Evento, Partido } from "@/domain/tipos";

export interface Marcador {
  local: number;
  visitante: number;
}

/**
 * Cuenta los goles de un partido a partir de los eventos. Un gol en contra
 * lo hace un jugador de `equipoId` y suma para el rival.
 */
export function calcularMarcador(
  localId: string,
  visitanteId: string,
  eventosDelPartido: readonly Evento[],
): Marcador {
  const marcador: Marcador = { local: 0, visitante: 0 };
  for (const e of eventosDelPartido) {
    if (e.tipo !== "gol" && e.tipo !== "gol_en_contra") continue;
    if (e.equipoId !== localId && e.equipoId !== visitanteId) continue;
    const esLocal = e.equipoId === localId;
    const sumaLocal = e.tipo === "gol" ? esLocal : !esLocal;
    if (sumaLocal) marcador.local++;
    else marcador.visitante++;
  }
  return marcador;
}

type PartidoJugado = Pick<Partido, "estado" | "penalesLocal" | "penalesVisitante"> & {
  localId: string;
  visitanteId: string;
};

/**
 * Ganador de un partido finalizado. Si terminó empatado, define por penales
 * (si están cargados). Devuelve null si no hay ganador.
 */
export function ganadorDe(partido: PartidoJugado, marcador: Marcador): string | null {
  if (partido.estado !== "finalizado") return null;
  if (marcador.local !== marcador.visitante) {
    return marcador.local > marcador.visitante ? partido.localId : partido.visitanteId;
  }
  const { penalesLocal: pl, penalesVisitante: pv } = partido;
  if (pl === null || pv === null || pl === pv) return null;
  return pl > pv ? partido.localId : partido.visitanteId;
}
