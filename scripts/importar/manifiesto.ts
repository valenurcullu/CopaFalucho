import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ManifiestoFotos } from "../../src/lib/datos/fotos";

/** Lee src/generated/fotos-jugadores.json (acepta el formato viejo, una lista de ids). */
export async function leerManifiesto(archivo: string): Promise<ManifiestoFotos> {
  try {
    const contenido = JSON.parse(await readFile(archivo, "utf8"));
    return Array.isArray(contenido) ? Object.fromEntries(contenido.map((id: string) => [id, null])) : contenido;
  } catch {
    return {};
  }
}

export async function guardarManifiesto(archivo: string, manifiesto: ManifiestoFotos) {
  const ordenado = Object.fromEntries(Object.entries(manifiesto).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, JSON.stringify(ordenado, null, 2) + "\n");
}
