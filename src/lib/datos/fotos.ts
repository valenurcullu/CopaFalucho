import fotosEquipos from "@/generated/fotos-equipos.json";
import fotosJugadores from "@/generated/fotos-jugadores.json";
import type { Equipo, Jugador } from "@/domain/tipos";

/**
 * Fotos de jugadores optimizadas en public/jugadores: id del jugador → id del
 * archivo de Drive del que salió (null si vino del importador de álbum).
 */
export type ManifiestoFotos = Record<string, string | null>;

const manifiestoJugadores: ManifiestoFotos = Array.isArray(fotosJugadores)
  ? Object.fromEntries((fotosJugadores as string[]).map((id) => [id, null]))
  : (fotosJugadores as ManifiestoFotos);
const equiposConFoto = new Set<string>(fotosEquipos);

/**
 * Usa la foto optimizada (public/jugadores) cuando corresponde:
 * - si la foto del jugador viene del formulario, solo si se optimizó esa misma
 *   foto (si mandó una nueva, se muestra la nueva hasta correr fotos:arreglar);
 * - si no tiene foto, la importada del álbum.
 */
export function completarFotos(jugadores: Jugador[], manifiesto: ManifiestoFotos = manifiestoJugadores): Jugador[] {
  return jugadores.map((j) => {
    if (!(j.id in manifiesto)) return j;
    const local = { ...j, fotoUrl: `/jugadores/${j.id}.webp` };
    if (j.fotoDriveId) return manifiesto[j.id] === j.fotoDriveId ? local : j;
    return j.fotoUrl ? j : local;
  });
}

/** Igual que `completarFotos`, para las fotos de perfil de los equipos (`npm run equipos:fotos`). */
export function completarFotosEquipos(equipos: Equipo[], disponibles: ReadonlySet<string> = equiposConFoto): Equipo[] {
  return equipos.map((e) => (e.fotoUrl || !disponibles.has(e.id) ? e : { ...e, fotoUrl: `/equipos/${e.id}.webp` }));
}
