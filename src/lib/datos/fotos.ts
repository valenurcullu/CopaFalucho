import fotosEquipos from "@/generated/fotos-equipos.json";
import fotosJugadores from "@/generated/fotos-jugadores.json";
import type { Equipo, Jugador } from "@/domain/tipos";

/**
 * Fotos de jugadores optimizadas con `npm run fotos:arreglar` (en public/jugadores):
 * id del jugador → id del archivo de Drive del que salió.
 */
export type ManifiestoFotos = Record<string, string>;

const manifiestoJugadores = fotosJugadores as ManifiestoFotos;
const equiposConFoto = new Set<string>(fotosEquipos);

/**
 * Usa la foto optimizada (public/jugadores) si es de la misma foto que el
 * jugador subió por el formulario. Si mandó una nueva, se muestra la nueva
 * hasta que se vuelva a correr `npm run fotos:arreglar`.
 */
export function completarFotos(jugadores: Jugador[], manifiesto: ManifiestoFotos = manifiestoJugadores): Jugador[] {
  return jugadores.map((j) =>
    j.fotoDriveId && manifiesto[j.id] === j.fotoDriveId ? { ...j, fotoUrl: `/jugadores/${j.id}.webp` } : j,
  );
}

/** Igual que `completarFotos`, para las fotos de perfil de los equipos (`npm run equipos:fotos`). */
export function completarFotosEquipos(equipos: Equipo[], disponibles: ReadonlySet<string> = equiposConFoto): Equipo[] {
  return equipos.map((e) => (e.fotoUrl || !disponibles.has(e.id) ? e : { ...e, fotoUrl: `/equipos/${e.id}.webp` }));
}
