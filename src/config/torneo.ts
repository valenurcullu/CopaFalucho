import type { TorneoConfig } from "@/domain/config";

/**
 * Reglas y formato de la Copa Falucho, según el reglamento (ver config/reglamento.ts).
 * Para un torneo nuevo, en general alcanza con cambiar `edicion` y cargar
 * la planilla: las zonas y los cruces salen solos de la hoja Equipos.
 */
export const torneoConfig: TorneoConfig = {
  edicion: 2026,
  puntos: { victoria: 3, empate: 1, derrota: 0 },
  desempate: ["enfrentamiento_directo", "diferencia_gol", "goles_a_favor", "goles_en_contra", "ranking_anterior"],
  desempateGeneral: ["diferencia_gol", "goles_a_favor", "goles_en_contra", "fair_play"],
  fairPlay: { amarilla: 1, roja: 3 },
  formato: {
    clasificadosPorZona: 2,
    cruces: "general",
    tercerPuesto: false,
    llaves: "auto",
  },
  duracionMinutos: 40,
  descansoMinutos: 5,
  sanciones: { amarillasParaSuspension: 3, limpiarAmarillasEn: "semis" },
  jugadores: {
    mostrarFichas: true,
    mostrarPesoAltura: true,
  },
  revalidarSegundos: 300,
};
