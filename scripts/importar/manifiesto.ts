import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ManifiestoFotos } from "../../src/lib/datos/fotos";

/** Lee src/generated/fotos-jugadores.json. */
export async function leerManifiesto(archivo: string): Promise<ManifiestoFotos> {
  try {
    return JSON.parse(await readFile(archivo, "utf8"));
  } catch {
    return {};
  }
}

export async function guardarManifiesto(archivo: string, manifiesto: ManifiestoFotos) {
  const ordenado = Object.fromEntries(Object.entries(manifiesto).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, JSON.stringify(ordenado, null, 2) + "\n");
}
