import type { Fase } from "./tipos";

export type CriterioDesempate =
  /** Puntos en los partidos entre los empatados. */
  | "enfrentamiento_directo"
  | "diferencia_gol"
  | "goles_a_favor"
  /** Menos es mejor. */
  | "goles_en_contra"
  /** Menos tarjetas es mejor (amarilla y roja pesan según `fairPlay`). */
  | "fair_play"
  /** Mejor puesto en el ranking del año anterior (columna ranking_anterior de Equipos). */
  | "ranking_anterior";

/** De dónde sale cada equipo de una llave de fase final. */
export type OrigenLlave =
  | { tipo: "posicion"; zona: string; puesto: number }
  /** Puesto en la tabla general de clasificados (todas las zonas juntas). */
  | { tipo: "general"; puesto: number }
  | { tipo: "ganador"; llave: string }
  | { tipo: "perdedor"; llave: string };

export interface LlaveConfig {
  /** Código que se escribe en la columna "llave" de la hoja Partidos. */
  id: string;
  fase: Fase;
  /** Posición vertical dentro de su fase (para dibujar el cuadro). */
  orden: number;
  local: OrigenLlave;
  visitante: OrigenLlave;
}

export interface TorneoConfig {
  edicion: number;
  puntos: { victoria: number; empate: number; derrota: number };
  /** Desempate dentro de una zona. Se aplican en orden después de los puntos. */
  desempate: CriterioDesempate[];
  /**
   * Desempate de la tabla general de clasificados (equipos de distintas
   * zonas, así que no se usa el enfrentamiento directo).
   */
  desempateGeneral: CriterioDesempate[];
  fairPlay: { amarilla: number; roja: number };
  formato: {
    clasificadosPorZona: number;
    /**
     * Cómo se arman los cruces automáticos:
     * - "general": se ordena a todos los clasificados en una tabla general y se
     *   cruza 1º-8º, 4º-5º, 2º-7º, 3º-6º (así se jugó la Copa 2024).
     * - "zonas": 1A-2B, 1C-2D, 1B-2A, 1D-2C.
     */
    cruces: "general" | "zonas";
    tercerPuesto: boolean;
    /**
     * "auto" arma los cruces solo a partir de las zonas que haya en la hoja
     * Equipos. Si se quiere otro cuadro, se puede pasar la lista a mano.
     */
    llaves: "auto" | LlaveConfig[];
  };
  /** Duración de un partido (sin el descanso). */
  duracionMinutos: number;
  /** Descanso entre tiempos. Con la duración, define cuándo "se está jugando" un partido según la hora. */
  descansoMinutos: number;
  sanciones: {
    /** Amarillas acumuladas que dan una fecha de suspensión. */
    amarillasParaSuspension: number;
    /** A partir de esta fase se limpian las amarillas acumuladas. */
    limpiarAmarillasEn: Fase | null;
  };
  jugadores: {
    mostrarFichas: boolean;
    mostrarPesoAltura: boolean;
  };
  /** Cada cuánto se vuelve a leer la planilla. */
  revalidarSegundos: number;
}
