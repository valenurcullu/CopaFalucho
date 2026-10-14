import Papa from "papaparse";
import { sinAcentos } from "./campos";

export type FilaCruda = Record<string, string>;

const ALIAS_COLUMNAS: Record<string, string> = {
  ano: "anio",
  nombre_opcional: "nombre",
  escudo_url_opcional: "escudo_url",
  escudo: "escudo_url",
  foto: "foto_url",
  peso: "peso_kg",
  altura: "altura_cm",
  nro: "numero",
  fecha_numero: "fecha_nro",
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
    transformHeader: normalizarColumna,
  });
  return { columnas: meta.fields ?? [], filas: data };
}

export function escribirCsv(columnas: readonly string[], filas: (string | number | null)[][]): string {
  return Papa.unparse({ fields: [...columnas], data: filas.map((f) => f.map((v) => v ?? "")) }) + "\n";
}
