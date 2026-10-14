import "server-only";
import { cache } from "react";
import { torneoConfig } from "@/config/torneo";
import { obtenerDatos } from "@/lib/datos";
import { analizarTorneo, type Torneo } from "./analizar";

export type { Torneo, PartidoVista, ZonaVista, LlaveVista, Resultado } from "./analizar";

/** Datos del torneo ya procesados (tablas, llaves, estadísticas). */
export const obtenerTorneo = cache(async (): Promise<Torneo> => analizarTorneo(await obtenerDatos(), torneoConfig));
