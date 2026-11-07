import Papa from "papaparse";
import { sinAcentos } from "./campos";

export type FilaCruda = Record<string, string>;

const ALIAS_COLUMNAS: Record<string, string> = {
  ano: "anio",
  nombre_opcional: "nombre",
  escudo_url_opcional: "foto_url",
  escudo_url: "foto_url",
  escudo: "foto_url",
  foto: "foto_url",
  ranking: "ranking_anterior",
  descuento: "puntos_descontados",
  peso: "peso_kg",
  altura: "altura_cm",
  nro: "numero",
  fecha_numero: "fecha_nro",
  jugador_id: "jugador",
  goles_l: "goles_local",
  goles_v: "goles_visitante",
  referee: "arbitro",
  fechas: "fechas_sancion",
  fechas_de_sancion: "fechas_sancion",
};

/** "Año", " Número " o "fecha nro" → "anio", "numero", "fecha_nro". */
export function normalizarColumna(nombre: string): string {
  const clave = sinAcentos(nombre).trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIAS_COLUMNAS[clave] ?? clave;
}

/** Parsea un CSV con encabezado. Descarta filas completamente vacías. */
export function leerCsv(contenido: string): { columnas: string[]; filas: FilaCruda[] } {
  const { data, meta } = Papa.parse<FilaCruda>(contenido.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    // Google exporta también las columnas vacías del costado: se les da un
    // nombre único para descartarlas después.
    transformHeader: (nombre, indice) => normalizarColumna(nombre) || `${COLUMNA_VACIA}${indice}`,
  });
  const columnas = (meta.fields ?? []).filter((c) => !c.startsWith(COLUMNA_VACIA));
  const filas = data.map((fila) => Object.fromEntries(columnas.map((c) => [c, fila[c] ?? ""])));
  return { columnas, filas };
}

const COLUMNA_VACIA = "__vacia_";

export function escribirCsv(columnas: readonly string[], filas: (string | number | null)[][]): string {
  return Papa.unparse({ fields: [...columnas], data: filas.map((f) => f.map((v) => v ?? "")) }) + "\n";
}
