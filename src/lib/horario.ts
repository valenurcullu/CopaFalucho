/**
 * Qué se está jugando según la hora. Los partidos empiezan puntuales, así que
 * con fecha, hora y duración alcanza: no hace falta que nadie cargue nada.
 * Las fechas y horas de la planilla son de Buenos Aires (UTC-3, sin horario de verano).
 */

const ZONA_HORARIA_AR = "-03:00";

interface ConHorario {
  fecha: string | null;
  hora: string | null;
  estado: "programado" | "finalizado";
}

export interface Duracion {
  duracionMinutos: number;
  descansoMinutos: number;
}

/** Momento de inicio del partido, o null si falta la fecha o la hora. */
export function inicioPartido(p: Pick<ConHorario, "fecha" | "hora">): Date | null {
  if (!p.fecha || !p.hora) return null;
  return new Date(`${p.fecha}T${p.hora}:00${ZONA_HORARIA_AR}`);
}

/** true si, según la hora, el partido está en la cancha ahora. */
export function seEstaJugando(p: ConHorario, ahora: Date, duracion: Duracion): boolean {
  const inicio = inicioPartido(p);
  if (!inicio) return false;
  const fin = inicio.getTime() + (duracion.duracionMinutos + duracion.descansoMinutos) * 60_000;
  return ahora.getTime() >= inicio.getTime() && ahora.getTime() < fin;
}

/** Partidos que se están jugando ahora. */
export function partidosEnCancha<T extends ConHorario>(partidos: readonly T[], ahora: Date, duracion: Duracion): T[] {
  return partidos.filter((p) => seEstaJugando(p, ahora, duracion));
}

/**
 * Próximo turno: los partidos sin jugar que empiezan a la misma hora, la más
 * cercana en el futuro.
 */
export function proximoTurno<T extends ConHorario>(partidos: readonly T[], ahora: Date): T[] {
  const futuros = partidos
    .filter((p) => p.estado !== "finalizado")
    .map((p) => ({ p, inicio: inicioPartido(p)?.getTime() ?? NaN }))
    .filter((x) => x.inicio > ahora.getTime());
  if (futuros.length === 0) return [];
  const primero = Math.min(...futuros.map((x) => x.inicio));
  return futuros.filter((x) => x.inicio === primero).map((x) => x.p);
}
