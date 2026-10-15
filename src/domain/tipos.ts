/**
 * Modelo de dominio del torneo. Todo lo que viene de la planilla (o de los
 * datos de ejemplo) se normaliza a estos tipos antes de llegar a la UI.
 */

export type Fase = "zona" | "octavos" | "cuartos" | "semis" | "tercer_puesto" | "final";

export type EstadoPartido = "programado" | "en_juego" | "finalizado";

export type TipoEvento = "gol" | "gol_en_contra" | "amarilla" | "roja";

export interface Equipo {
  /** Código con el que se lo nombra en la planilla: "2001", "8YPICO", "RDM". */
  id: string;
  /** Año de la clase. Vacío en equipos que no son de un solo año (80 y pico, RDM…). */
  anio: number | null;
  zona: string | null;
  /** Nombre a mostrar: el de la planilla, o "Clase {año}", o el id. */
  nombre: string;
  /** Texto corto para el distintivo: "’01", "80+", "RDM". */
  sigla: string;
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
  /**
   * Resultado cargado a mano. Si está, es el oficial; si no, se calcula con
   * los goles de Eventos.
   */
  golesLocal: number | null;
  golesVisitante: number | null;
  /** Texto libre: un nombre, o una clase ("2000") cuando arbitra otro equipo. */
  arbitro: string | null;
  /** Si el árbitro es un equipo del torneo, su id. */
  arbitroEquipoId: string | null;
  estado: EstadoPartido;
  penalesLocal: number | null;
  penalesVisitante: number | null;
  /** Fila de la planilla, para los avisos. */
  fila: number;
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
  /** Como lo conocen todos: "Coke", "Mapache". */
  apodo: string | null;
  numero: number | null;
  posicion: string | null;
  fotoUrl: string | null;
  pesoKg: number | null;
  alturaCm: number | null;
  /** true si no está en la hoja Jugadores y se creó a partir de un evento. */
  soloEnEventos: boolean;
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
