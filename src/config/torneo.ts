import type { TorneoConfig } from "@/domain/config";

/**
 * Reglas y formato de la Copa Falucho.
 * Para un torneo nuevo, en general alcanza con cambiar `edicion` y cargar
 * la planilla: las zonas y los cruces salen solos de la hoja Equipos.
 */
export const torneoConfig: TorneoConfig = {
  edicion: 2026,
  puntos: { victoria: 3, empate: 1, derrota: 0 },
  desempate: ["diferencia_gol", "goles_a_favor", "fair_play"],
  fairPlay: { amarilla: 1, roja: 3 },
  formato: {
    clasificadosPorZona: 2,
    tercerPuesto: false,
    llaves: "auto",
  },
  duracionMinutos: 50,
  jugadores: {
    mostrarFichas: true,
    mostrarPesoAltura: true,
  },
  revalidarSegundos: 300,
};
