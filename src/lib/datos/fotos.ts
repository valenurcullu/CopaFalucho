import fotosImportadas from "@/generated/fotos-jugadores.json";
import type { Jugador } from "@/domain/tipos";

const conFoto = new Set<string>(fotosImportadas);

/**
 * Completa la foto de los jugadores que no tienen foto_url en la planilla
 * pero sí una foto importada con `npm run jugadores:importar`.
 */
export function completarFotos(jugadores: Jugador[], disponibles: ReadonlySet<string> = conFoto): Jugador[] {
  return jugadores.map((j) => (j.fotoUrl || !disponibles.has(j.id) ? j : { ...j, fotoUrl: `/jugadores/${j.id}.webp` }));
}
