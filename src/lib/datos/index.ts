import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { torneoConfig } from "@/config/torneo";
import type { DatosTorneo } from "@/domain/tipos";
import { armarDatos } from "./armar";
import { leerEjemplo, leerPlanilla } from "./fuentes";

export const TAG_DATOS = "datos-torneo";

/**
 * Punto único de lectura de datos. Si está configurado GOOGLE_SHEET_ID lee la
 * planilla; si no, usa los datos de ejemplo. El resultado se cachea en el
 * servidor y se vuelve a leer en segundo plano cada `revalidarSegundos`.
 */
export async function obtenerDatos(): Promise<DatosTorneo> {
  "use cache";
  cacheLife({
    stale: torneoConfig.revalidarSegundos,
    revalidate: torneoConfig.revalidarSegundos,
    expire: 60 * 60 * 24,
  });
  cacheTag(TAG_DATOS);

  const idPlanilla = process.env.GOOGLE_SHEET_ID?.trim();
  const hojas = idPlanilla ? await leerPlanilla(idPlanilla) : await leerEjemplo();
  return armarDatos(hojas, {
    origen: idPlanilla ? "planilla" : "ejemplo",
    duracionMinutos: torneoConfig.duracionMinutos,
  });
}
