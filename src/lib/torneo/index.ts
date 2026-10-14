import "server-only";
import { torneoConfig } from "@/config/torneo";
import { obtenerDatos } from "@/lib/datos";
import { analizarTorneo, type Torneo } from "./analizar";

export type { Torneo, PartidoVista, ZonaVista, LlaveVista, Resultado } from "./analizar";

/** Datos del torneo ya procesados (tablas, llaves, estadísticas). */
export async function obtenerTorneo(): Promise<Torneo> {
  return analizarTorneo(await obtenerDatos(), torneoConfig);
}
