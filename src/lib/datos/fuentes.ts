import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Hoja } from "@/domain/tipos";
import type { HojasCrudas } from "./armar";
import { leerCsv, normalizarColumna, type FilaCruda } from "./csv";
import { esFormularioDeJugadores } from "./formulario";
import { COLUMNAS } from "./esquemas";

type HojaObligatoria = Exclude<Hoja, "Formulario" | "Sanciones">;

export const HOJAS: readonly HojaObligatoria[] = ["Equipos", "Partidos", "Eventos", "Jugadores"];

/** Pestaña con las respuestas del Google Form de jugadores (opcional). */
export const HOJA_FORMULARIO = "Formulario";

/** Pestaña con suspensiones cargadas a mano (opcional). */
export const HOJA_SANCIONES = "Sanciones";

/** true si la tabla parece la pestaña Sanciones (y no otra que devolvió gviz por no existir esa). */
function esHojaDeSanciones(columnas: readonly string[]): boolean {
  return ["equipo", "jugador", "fechas_sancion"].every((c) => columnas.includes(c)) && !columnas.includes("partido_id");
}

/** Columnas mínimas para reconocer cada hoja (gviz devuelve la primera hoja si el nombre no existe). */
const COLUMNAS_CLAVE: Record<HojaObligatoria, string[]> = {
  Equipos: ["anio", "zona"],
  Partidos: ["fase", "local", "visitante", "estado"],
  Eventos: ["partido_id", "tipo", "equipo"],
  Jugadores: ["equipo", "nombre"],
};

function verificarColumnas(hoja: HojaObligatoria, columnas: string[]) {
  const faltan = COLUMNAS_CLAVE[hoja].filter((c) => !columnas.includes(c));
  if (faltan.length > 0) {
    const esperadas = COLUMNAS[hoja].join(", ");
    throw new Error(
      `La hoja "${hoja}" no tiene las columnas ${faltan.map(normalizarColumna).join(", ")}. ` +
        `¿Existe una pestaña con ese nombre exacto? Columnas esperadas: ${esperadas}.`,
    );
  }
}

async function leerHojas(leer: (hoja: string) => Promise<string>): Promise<HojasCrudas> {
  const [contenidos, formulario, sanciones] = await Promise.all([
    Promise.all(HOJAS.map(leer)),
    // Opcionales: si no están o no se pueden leer, la app sigue sin ellas.
    leer(HOJA_FORMULARIO).catch(() => ""),
    leer(HOJA_SANCIONES).catch(() => ""),
  ]);
  const entradas = HOJAS.map((hoja, i) => {
    const { columnas, filas } = leerCsv(contenidos[i]);
    // Una hoja totalmente vacía (ni encabezado) cuenta como sin filas.
    if (columnas.length > 0) verificarColumnas(hoja, columnas);
    return [hoja, filas] as const;
  });
  // Si la pestaña no existe, gviz devuelve la primera hoja: solo se usa si tiene las preguntas del formulario.
  const respuestas = leerCsv(formulario);
  const suspensiones = leerCsv(sanciones);
  return {
    ...(Object.fromEntries(entradas) as Record<HojaObligatoria, FilaCruda[]>),
    Formulario: esFormularioDeJugadores(respuestas.columnas) ? respuestas.filas : [],
    Sanciones: esHojaDeSanciones(suspensiones.columnas) ? suspensiones.filas : [],
  };
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
/** Última versión buena de cada hoja, para no cortar la app si Google tarda o falla. */
const ultimaLectura = new Map<string, string>();

/** Etiqueta del caché de Next para todas las lecturas de la planilla: permite descartarlas juntas. */
export const ETIQUETA_PLANILLA = "planilla";

const ESPERA_MS = 8_000;
const INTENTOS = 2;

async function pedirHoja(url: string, hoja: string, revalidarSegundos: number): Promise<string> {
  const respuesta = await fetch(url, { next: { revalidate: revalidarSegundos, tags: [ETIQUETA_PLANILLA] }, signal: AbortSignal.timeout(ESPERA_MS) });
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer la hoja "${hoja}" (HTTP ${respuesta.status}). ¿Está compartida con el link?`);
  }
  const tipo = respuesta.headers.get("content-type") ?? "";
  if (tipo.includes("text/html")) {
    throw new Error(`Google devolvió una página en vez de la hoja "${hoja}". Revisá que la planilla esté compartida con el link.`);
  }
  return respuesta.text();
}

const urlHoja = (idPlanilla: string, hoja: string) =>
  `https://docs.google.com/spreadsheets/d/${encodeURIComponent(idPlanilla)}` +
  `/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(hoja)}`;

/**
 * Copia de la planilla para `next build`. El build genera las páginas en varios
 * procesos a la vez y, si cada uno le pide la planilla a Google, Google corta
 * con HTTP 429. Por eso `prebuild` la baja una sola vez y el build lee de acá.
 */
const CARPETA_BUILD = path.join(process.cwd(), ".next", "cache", "planilla-build");
const archivoBuild = (hoja: string) => path.join(CARPETA_BUILD, `${hoja.toLowerCase()}.csv`);
const enBuild = () => process.env.NEXT_PHASE === "phase-production-build";

/** Baja todas las hojas, de a una, y las guarda para el build. */
export async function descargarPlanillaParaBuild(idPlanilla: string): Promise<string[]> {
  await mkdir(CARPETA_BUILD, { recursive: true });
  const guardadas: string[] = [];
  for (const hoja of [...HOJAS, HOJA_FORMULARIO, HOJA_SANCIONES]) {
    const texto = await pedirHoja(urlHoja(idPlanilla, hoja), hoja, 0).catch((error) => {
      if (hoja === HOJA_FORMULARIO || hoja === HOJA_SANCIONES) return null; // opcionales
      throw error;
    });
    if (texto === null) continue;
    await writeFile(archivoBuild(hoja), texto, "utf8");
    guardadas.push(hoja);
  }
  return guardadas;
}

export function leerPlanilla(idPlanilla: string, revalidarSegundos: number): Promise<HojasCrudas> {
  return leerHojas(async (hoja) => {
    if (enBuild()) {
      const copia = await readFile(archivoBuild(hoja), "utf8").catch(() => null);
      if (copia !== null) return copia;
    }
    const url = urlHoja(idPlanilla, hoja);
    let ultimoError: unknown;
    for (let intento = 1; intento <= INTENTOS; intento++) {
      try {
        const texto = await pedirHoja(url, hoja, revalidarSegundos);
        ultimaLectura.set(url, texto);
        return texto;
      } catch (error) {
        ultimoError = error;
      }
    }
    // Google tardó o falló dos veces: se sigue con lo último que se leyó bien.
    const anterior = ultimaLectura.get(url);
    if (anterior !== undefined) {
      console.warn(`No se pudo leer la hoja "${hoja}" (${(ultimoError as Error).message}); se usa la última versión leída.`);
      return anterior;
    }
    throw ultimoError;
  });
}
