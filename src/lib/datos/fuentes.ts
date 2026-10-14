import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Hoja } from "@/domain/tipos";
import type { HojasCrudas } from "./armar";
import { leerCsv, normalizarColumna } from "./csv";
import { COLUMNAS } from "./esquemas";

export const HOJAS: readonly Hoja[] = ["Equipos", "Partidos", "Eventos", "Jugadores"];

/** Columnas mínimas para reconocer cada hoja (gviz devuelve la primera hoja si el nombre no existe). */
const COLUMNAS_CLAVE: Record<Hoja, string[]> = {
  Equipos: ["anio", "zona"],
  Partidos: ["fase", "local", "visitante", "estado"],
  Eventos: ["partido_id", "tipo", "equipo"],
  Jugadores: ["equipo", "nombre"],
};

function verificarColumnas(hoja: Hoja, columnas: string[]) {
  const faltan = COLUMNAS_CLAVE[hoja].filter((c) => !columnas.includes(c));
  if (faltan.length > 0) {
    const esperadas = COLUMNAS[hoja].join(", ");
    throw new Error(
      `La hoja "${hoja}" no tiene las columnas ${faltan.map(normalizarColumna).join(", ")}. ` +
        `¿Existe una pestaña con ese nombre exacto? Columnas esperadas: ${esperadas}.`,
    );
  }
}

async function leerHojas(leer: (hoja: Hoja) => Promise<string>): Promise<HojasCrudas> {
  const contenidos = await Promise.all(HOJAS.map(leer));
  const entradas = HOJAS.map((hoja, i) => {
    const { columnas, filas } = leerCsv(contenidos[i]);
    // Una hoja totalmente vacía (ni encabezado) cuenta como sin filas.
    if (columnas.length > 0) verificarColumnas(hoja, columnas);
    return [hoja, filas] as const;
  });
  return Object.fromEntries(entradas) as HojasCrudas;
}

/** Datos de ejemplo versionados en data/ejemplo (mismo formato que la planilla). */
export function leerEjemplo(): Promise<HojasCrudas> {
  const carpeta = path.join(process.cwd(), "data", "ejemplo");
  return leerHojas((hoja) => readFile(path.join(carpeta, `${hoja.toLowerCase()}.csv`), "utf8"));
}

/**
 * Google Sheets compartida como "cualquier persona con el vínculo puede ver".
 * El endpoint gviz devuelve el estado actual de la planilla, sin la demora
 * de varios minutos que tiene "Publicar en la Web".
 */
export function leerPlanilla(idPlanilla: string, revalidarSegundos: number): Promise<HojasCrudas> {
  return leerHojas(async (hoja) => {
    const url =
      `https://docs.google.com/spreadsheets/d/${encodeURIComponent(idPlanilla)}` +
      `/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(hoja)}`;
    const respuesta = await fetch(url, { next: { revalidate: revalidarSegundos }, signal: AbortSignal.timeout(10_000) });
    if (!respuesta.ok) {
      throw new Error(`No se pudo leer la hoja "${hoja}" (HTTP ${respuesta.status}). ¿Está compartida con el link?`);
    }
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (tipo.includes("text/html")) {
      throw new Error(`Google devolvió una página en vez de la hoja "${hoja}". Revisá que la planilla esté compartida con el link.`);
    }
    return respuesta.text();
  });
}
