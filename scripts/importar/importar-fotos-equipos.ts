/**
 * Importa las fotos de perfil de los equipos.
 *
 *   npm run equipos:fotos -- --fotos ./fotos-equipos
 *
 * Cada archivo se llama como el equipo en la planilla: 2001.jpg, 8ypico.png,
 * RDM.jpg (mayúsculas, espacios y acentos dan igual). Se recortan cuadradas,
 * centrando lo importante, y se guardan en WebP en public/equipos/{id}.webp.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { normalizarCodigo } from "../../src/lib/datos/campos";

const EXTENSIONES_FOTO = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"];

const RAIZ = process.cwd();
const DESTINO = path.join(RAIZ, "public", "equipos");
const MANIFIESTO = path.join(RAIZ, "src", "generated", "fotos-equipos.json");
const LADO = 400;

async function main() {
  const { values } = parseArgs({ options: { fotos: { type: "string" } } });
  if (!values.fotos) {
    console.error("Uso: npm run equipos:fotos -- --fotos ./carpeta-con-fotos");
    process.exit(1);
  }
  const carpeta = path.resolve(values.fotos);
  const archivos = (await readdir(carpeta)).filter((a) => !a.startsWith("."));
  await mkdir(DESTINO, { recursive: true });

  const importados: string[] = [];
  for (const archivo of archivos) {
    const extension = path.extname(archivo).toLowerCase();
    if (!EXTENSIONES_FOTO.includes(extension)) {
      console.log(`! ${archivo}: formato no soportado (usá jpg, png o webp)`);
      continue;
    }
    const id = normalizarCodigo(path.basename(archivo, path.extname(archivo)));
    try {
      await sharp(path.join(carpeta, archivo))
        .rotate()
        .resize({ width: LADO, height: LADO, fit: "cover", position: sharp.strategy.attention })
        .webp({ quality: 80 })
        .toFile(path.join(DESTINO, `${id}.webp`));
      importados.push(id);
      console.log(`✓ ${archivo} → public/equipos/${id}.webp`);
    } catch (error) {
      console.log(`✗ ${archivo}: no se pudo procesar (${(error as Error).message})`);
    }
  }

  let previos: string[] = [];
  try {
    previos = JSON.parse(await readFile(MANIFIESTO, "utf8"));
  } catch {
    // Primera importación.
  }
  await writeFile(MANIFIESTO, JSON.stringify([...new Set([...previos, ...importados])].sort(), null, 2) + "\n");
  console.log(`\n${importados.length} fotos importadas. El nombre de cada archivo tiene que coincidir con el id del equipo en la planilla.`);
  console.log("Para publicarlas: commit de public/equipos y src/generated, y push.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
