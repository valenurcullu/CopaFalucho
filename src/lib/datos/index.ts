import "server-only";
import { cache } from "react";
import { torneoConfig } from "@/config/torneo";
import type { DatosTorneo } from "@/domain/tipos";
import { armarDatos } from "./armar";
import { leerEjemplo, leerPlanilla } from "./fuentes";

/**
 * Punto único de lectura de datos. Si está configurado GOOGLE_SHEET_ID lee la
 * planilla; si no, usa los datos de ejemplo.
 *
 * El cacheo es de dos niveles: las páginas se regeneran cada 5 minutos
 * (ISR, ver `revalidate` en app/layout.tsx) y cada hoja de la planilla se
 * guarda `revalidarSegundos` en el Data Cache de Next. `cache` evita leer dos
 * veces en un mismo render.
 */
export const obtenerDatos = cache(async (): Promise<DatosTorneo> => {
  const idPlanilla = process.env.GOOGLE_SHEET_ID?.trim();
  const hojas = idPlanilla
    ? await leerPlanilla(idPlanilla, torneoConfig.revalidarSegundos)
    : await leerEjemplo();
  return armarDatos(hojas, {
    origen: idPlanilla ? "planilla" : "ejemplo",
    duracionMinutos: torneoConfig.duracionMinutos,
  });
});
