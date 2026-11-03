/**
 * Baja las fotos que subieron los jugadores por el formulario, las endereza,
 * las recorta centrando la cara y las guarda optimizadas en public/jugadores.
 *
 *   npm run fotos:arreglar            (solo las nuevas o cambiadas)
 *   npm run fotos:arreglar -- --todas (vuelve a procesar todas)
 *
 * Lee la planilla de GOOGLE_SHEET_ID (de .env.local). Después: commit de
 * public/jugadores y src/generated, y push.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { torneoConfig } from "../../src/config/torneo";
import { armarDatos } from "../../src/lib/datos/armar";
import { urlImagenDrive } from "../../src/lib/datos/formulario";
import { leerPlanilla } from "../../src/lib/datos/fuentes";
import { guardarManifiesto, leerManifiesto } from "./manifiesto";

const RAIZ = process.cwd();
const DESTINO = path.join(RAIZ, "public", "jugadores");
const MANIFIESTO = path.join(RAIZ, "src", "generated", "fotos-jugadores.json");

async function main() {
  const { values } = parseArgs({ options: { todas: { type: "boolean", default: false } } });
  try {
    process.loadEnvFile(path.join(RAIZ, ".env.local"));
  } catch {
    // Sin .env.local: se usa la variable de entorno si está.
  }
  const idPlanilla = process.env.GOOGLE_SHEET_ID?.trim();
  if (!idPlanilla) {
    console.error("Falta GOOGLE_SHEET_ID: ponelo en .env.local (ver .env.example).");
    process.exit(1);
  }

  const datos = armarDatos(await leerPlanilla(idPlanilla, 0), { origen: "planilla", duracionMinutos: torneoConfig.duracionMinutos });
  const conFoto = datos.jugadores.filter((j) => j.fotoDriveId);
  const manifiesto = await leerManifiesto(MANIFIESTO);
  const pendientes = conFoto.filter((j) => values.todas || manifiesto[j.id] !== j.fotoDriveId);
  console.log(`${conFoto.length} jugadores con foto del formulario · ${pendientes.length} para arreglar`);

  await mkdir(DESTINO, { recursive: true });
  let hechas = 0;
  let bytes = 0;
  for (const j of pendientes) {
    try {
      const respuesta = await fetch(urlImagenDrive(j.fotoDriveId!, 1600), { signal: AbortSignal.timeout(30_000) });
      const tipo = respuesta.headers.get("content-type") ?? "";
      if (!respuesta.ok || !tipo.startsWith("image/")) {
        throw new Error(`Drive respondió ${respuesta.status} (${tipo || "sin tipo"}). ¿La foto es pública?`);
      }
      const info = await sharp(Buffer.from(await respuesta.arrayBuffer()))
        .rotate()
        .resize({ width: 600, height: 750, fit: "cover", position: sharp.strategy.attention })
        .webp({ quality: 78, effort: 5 })
        .toFile(path.join(DESTINO, `${j.id}.webp`));
      manifiesto[j.id] = j.fotoDriveId!;
      hechas++;
      bytes += info.size;
      console.log(`✓ ${j.nombre} (${j.id})`);
    } catch (error) {
      console.log(`✗ ${j.nombre} (${j.id}): ${(error as Error).message}`);
    }
  }
  await guardarManifiesto(MANIFIESTO, manifiesto);
  console.log(`\n${hechas} fotos arregladas (${Math.round(bytes / 1024)} KB).`);
  if (hechas > 0) console.log("Para publicarlas: git add public/jugadores src/generated && git commit -m \"Fotos de jugadores\" && git push");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
