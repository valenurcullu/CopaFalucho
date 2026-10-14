/**
 * Modelo de dominio del torneo. Todo lo que viene de la planilla (o de los
 * datos de ejemplo) se normaliza a estos tipos antes de llegar a la UI.
 */

export type Fase = "zona" | "octavos" | "cuartos" | "semis" | "tercer_puesto" | "final";

export type EstadoPartido = "programado" | "en_juego" | "finalizado";

export type TipoEvento = "gol" | "gol_en_contra" | "amarilla" | "roja";

export interface Equipo {
  id: string;
  anio: number;
  zona: string | null;
  /** Nombre a mostrar: el opcional de la planilla o "Clase {año}". */
  nombre: string;
  escudoUrl: string | null;
}

export interface Partido {
  id: string;
  fase: Fase;
  zona: string | null;
  /** Código de llave de la fase final (C1, S1, F…). Vacío en fase de zonas. */
  llave: string | null;
  fechaNro: number | null;
  /** Formato ISO YYYY-MM-DD. */
  fecha: string | null;
  /** Formato HH:MM. */
  hora: string | null;
  cancha: string | null;
  /** Puede venir vacío en fase final: se resuelve a partir de la llave. */
  localId: string | null;
  visitanteId: string | null;
  arbitro: string | null;
  estado: EstadoPartido;
  penalesLocal: number | null;
  penalesVisitante: number | null;
}

export interface Evento {
  /** Generado al leer: posición de la fila en la hoja. */
  id: string;
  partidoId: string;
  tipo: TipoEvento;
  /** Equipo del jugador. En un gol en contra, el gol suma para el rival. */
  equipoId: string;
  jugadorId: string | null;
  minuto: number | null;
}

export interface Jugador {
  id: string;
  equipoId: string;
  nombre: string;
  numero: number | null;
  posicion: string | null;
  fotoUrl: string | null;
  pesoKg: number | null;
  alturaCm: number | null;
}

export type Hoja = "Equipos" | "Partidos" | "Eventos" | "Jugadores";

/**
 * Problema en una fila de la planilla, para mostrarle al admin.
 * "error": la fila se ignoró. "advertencia": se usó, pero conviene revisarla.
 */
export interface AvisoDatos {
  nivel: "error" | "advertencia";
  hoja: Hoja;
  /** Número de fila tal como se ve en la planilla (la 1 es el encabezado). */
  fila: number;
  mensaje: string;
}

export interface DatosTorneo {
  equipos: Equipo[];
  partidos: Partido[];
  eventos: Evento[];
  jugadores: Jugador[];
  avisos: AvisoDatos[];
  origen: "ejemplo" | "planilla";
  /** ISO timestamp del momento en que se leyeron los datos. */
  actualizadoEn: string;
}
