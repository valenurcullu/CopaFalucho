import fotosEquipos from "@/generated/fotos-equipos.json";
import fotosJugadores from "@/generated/fotos-jugadores.json";
import type { Equipo, Jugador } from "@/domain/tipos";

const jugadoresConFoto = new Set<string>(fotosJugadores);
const equiposConFoto = new Set<string>(fotosEquipos);

/**
 * Completa la foto de los jugadores que no tienen foto_url en la planilla
 * pero sí una foto importada con `npm run jugadores:importar`.
 */
export function completarFotos(jugadores: Jugador[], disponibles: ReadonlySet<string> = jugadoresConFoto): Jugador[] {
  return jugadores.map((j) => (j.fotoUrl || !disponibles.has(j.id) ? j : { ...j, fotoUrl: `/jugadores/${j.id}.webp` }));
}

/** Igual que `completarFotos`, para las fotos de perfil de los equipos (`npm run equipos:fotos`). */
export function completarFotosEquipos(equipos: Equipo[], disponibles: ReadonlySet<string> = equiposConFoto): Equipo[] {
  return equipos.map((e) => (e.fotoUrl || !disponibles.has(e.id) ? e : { ...e, fotoUrl: `/equipos/${e.id}.webp` }));
}
