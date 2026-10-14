/**
 * Importa jugadores desde un CSV y una carpeta de fotos.
 *
 *   npm run jugadores:importar -- --csv album.csv --fotos ./fotos [--validar]
 *
 * - Valida el CSV (mismas columnas que la hoja Jugadores).
 * - Optimiza cada foto (nombre del archivo = id del jugador): la endereza
 *   según el EXIF, la recorta a 4:5 buscando la cara y la guarda en WebP en
 *   public/jugadores/{id}.webp.
 * - Escribe data/jugadores-importados.csv, listo para pegar en la planilla.
 * - Actualiza src/generated/fotos-jugadores.json para que la app use las
 *   fotos aunque en la planilla no esté cargada la columna foto_url.
 *
 * Con --validar solo revisa, sin escribir nada.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { escribirCsv } from "../../src/lib/datos/csv";
import { COLUMNAS } from "../../src/lib/datos/esquemas";
import { validarImportacion, type Problema } from "./validar";

const RAIZ = process.cwd();
const CARPETA_FOTOS = path.join(RAIZ, "public", "jugadores");
const MANIFIESTO = path.join(RAIZ, "src", "generated", "fotos-jugadores.json");
const SALIDA_CSV = path.join(RAIZ, "data", "jugadores-importados.csv");
const ANCHO = 600;
const ALTO = 750;

const rutaPublica = (id: string) => `/jugadores/${id}.webp`;

function imprimir(problemas: Problema[]) {
  for (const p of problemas) {
    console.log(`${p.nivel === "error" ? "✗" : "!"} ${p.donde}: ${p.mensaje}`);
  }
}

async function optimizar(origen: string, id: string): Promise<number> {
  const destino = path.join(CARPETA_FOTOS, `${id}.webp`);
  const info = await sharp(origen)
    .rotate()
    .resize({ width: ANCHO, height: ALTO, fit: "cover", position: sharp.strategy.attention, withoutEnlargement: false })
    .webp({ quality: 78, effort: 5 })
    .toFile(destino);
  return info.size;
}

async function main() {
  const { values } = parseArgs({
    options: {
      csv: { type: "string" },
      fotos: { type: "string" },
      validar: { type: "boolean", default: false },
    },
  });
  if (!values.csv) {
    console.error("Uso: npm run jugadores:importar -- --csv album.csv --fotos ./carpeta-fotos [--validar]");
    process.exit(1);
  }

  const contenido = await readFile(path.resolve(values.csv), "utf8");
  const archivos = values.fotos ? await readdir(path.resolve(values.fotos)) : [];
  const { jugadores, fotos, problemas } = validarImportacion(contenido, archivos);

  imprimir(problemas);
  const errores = problemas.filter((p) => p.nivel === "error").length;
  const sinFoto = jugadores.filter((j) => !fotos.has(j.id) && !j.foto_url);
  console.log(
    `\n${jugadores.length} jugadores válidos · ${fotos.size} fotos · ${sinFoto.length} sin foto (se muestra la silueta)` +
      ` · ${errores} errores · ${problemas.length - errores} advertencias`,
  );
  if (errores > 0) {
    console.log("\nCorregí los errores y volvé a correr el importador. No se escribió nada.");
    process.exit(1);
  }
  if (values.validar) {
    console.log("\nModo --validar: no se escribió nada.");
    return;
  }

  await mkdir(CARPETA_FOTOS, { recursive: true });
  let bytes = 0;
  let hechas = 0;
  for (const [id, archivo] of fotos) {
    try {
      bytes += await optimizar(path.join(path.resolve(values.fotos!), archivo), id);
      hechas++;
    } catch (error) {
      console.log(`✗ ${archivo}: no se pudo procesar (${(error as Error).message})`);
      fotos.delete(id);
    }
  }
  if (hechas > 0) console.log(`✓ ${hechas} fotos optimizadas en public/jugadores (${Math.round(bytes / 1024)} KB en total)`);

  // Manifiesto: suma las fotos nuevas a las que ya estaban importadas.
  let previas: string[] = [];
  try {
    previas = JSON.parse(await readFile(MANIFIESTO, "utf8"));
  } catch {
    // Primera importación.
  }
  const conFoto = [...new Set([...previas, ...fotos.keys()])].sort();
  await mkdir(path.dirname(MANIFIESTO), { recursive: true });
  await writeFile(MANIFIESTO, JSON.stringify(conFoto, null, 2) + "\n");

  const filas = jugadores.map((j) => [
    j.id, j.equipo, j.nombre, j.numero, j.posicion,
    fotos.has(j.id) ? rutaPublica(j.id) : j.foto_url,
    j.peso_kg, j.altura_cm,
  ]);
  await writeFile(SALIDA_CSV, escribirCsv(COLUMNAS.Jugadores, filas));
  console.log(`✓ ${path.relative(RAIZ, SALIDA_CSV)}: copialo en la hoja Jugadores de la planilla`);
  console.log("\nPara publicar las fotos: hacé commit de public/jugadores y src/generated, y push (Vercel despliega solo).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
