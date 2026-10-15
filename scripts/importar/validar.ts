import { leerCsv } from "../../src/lib/datos/csv";
import { filaJugador } from "../../src/lib/datos/esquemas";

export interface JugadorImportado {
  id: string;
  equipo: string;
  nombre: string;
  apodo: string | null;
  numero: number | null;
  posicion: string | null;
  foto_url: string | null;
  peso_kg: number | null;
  altura_cm: number | null;
}

export interface Problema {
  nivel: "error" | "advertencia";
  /** Fila del CSV (la 1 es el encabezado) o nombre de archivo de foto. */
  donde: string;
  mensaje: string;
}

export interface ResultadoValidacion {
  jugadores: JugadorImportado[];
  /** id de jugador → nombre del archivo de foto encontrado. */
  fotos: Map<string, string>;
  problemas: Problema[];
}

export const EXTENSIONES_FOTO = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"];

const extension = (archivo: string) => archivo.slice(archivo.lastIndexOf(".")).toLowerCase();
const base = (archivo: string) => archivo.slice(0, archivo.lastIndexOf(".")).trim().toUpperCase();

/**
 * Valida el CSV de jugadores y lo cruza con los archivos de fotos (nombre del
 * archivo = id del jugador). No toca el disco: recibe los nombres de archivo.
 */
export function validarImportacion(contenidoCsv: string, archivosFotos: readonly string[]): ResultadoValidacion {
  const problemas: Problema[] = [];
  const { columnas, filas } = leerCsv(contenidoCsv);
  for (const requerida of ["id", "equipo", "nombre"]) {
    if (!columnas.includes(requerida)) {
      problemas.push({ nivel: "error", donde: "encabezado", mensaje: `Falta la columna "${requerida}"` });
    }
  }
  if (problemas.length > 0) return { jugadores: [], fotos: new Map(), problemas };

  const jugadores: JugadorImportado[] = [];
  const ids = new Set<string>();
  const numerosPorEquipo = new Map<string, Map<number, string>>();

  filas.forEach((cruda, i) => {
    const donde = `fila ${i + 2}`;
    const r = filaJugador.safeParse(cruda);
    if (!r.success) {
      problemas.push({ nivel: "error", donde, mensaje: r.error.issues.map((x) => x.message).join(". ") });
      return;
    }
    const j = r.data;
    if (ids.has(j.id)) {
      problemas.push({ nivel: "error", donde, mensaje: `El id ${j.id} está repetido` });
      return;
    }
    ids.add(j.id);
    if (!/^\d{4}$/.test(j.equipo)) {
      problemas.push({ nivel: "advertencia", donde, mensaje: `El equipo "${j.equipo}" no parece un año de clase` });
    }
    if (j.numero !== null) {
      const numeros = numerosPorEquipo.get(j.equipo) ?? new Map<number, string>();
      const otro = numeros.get(j.numero);
      if (otro) problemas.push({ nivel: "advertencia", donde, mensaje: `El número ${j.numero} ya lo tiene ${otro} en la clase ${j.equipo}` });
      numeros.set(j.numero, j.nombre);
      numerosPorEquipo.set(j.equipo, numeros);
    }
    if (j.peso_kg === null || j.altura_cm === null) {
      problemas.push({ nivel: "advertencia", donde, mensaje: `A ${j.nombre} le falta el peso o la altura` });
    }
    jugadores.push({ ...j });
  });

  const fotos = new Map<string, string>();
  for (const archivo of archivosFotos) {
    if (archivo.startsWith(".")) continue;
    if (!EXTENSIONES_FOTO.includes(extension(archivo))) {
      problemas.push({ nivel: "advertencia", donde: archivo, mensaje: "Formato de imagen no soportado (usá jpg, png o webp)" });
      continue;
    }
    const id = base(archivo);
    if (!ids.has(id)) {
      problemas.push({ nivel: "advertencia", donde: archivo, mensaje: `No hay ningún jugador con id ${id}` });
      continue;
    }
    if (fotos.has(id)) {
      problemas.push({ nivel: "advertencia", donde: archivo, mensaje: `Hay más de una foto para ${id}: se usa ${fotos.get(id)}` });
      continue;
    }
    fotos.set(id, archivo);
  }

  return { jugadores, fotos, problemas };
}
