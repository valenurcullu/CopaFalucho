import type { Fase } from "./tipos";

export type CriterioDesempate =
  | "diferencia_gol"
  | "goles_a_favor"
  | "fair_play"
  | "enfrentamiento_directo";

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
  /** Se aplican en orden después de los puntos. */
  desempate: CriterioDesempate[];
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
  /** Duración de un partido, para validar los minutos de los eventos. */
  duracionMinutos: number;
  jugadores: {
    mostrarFichas: boolean;
    mostrarPesoAltura: boolean;
  };
  /** Cada cuánto se vuelve a leer la planilla. */
  revalidarSegundos: number;
}
