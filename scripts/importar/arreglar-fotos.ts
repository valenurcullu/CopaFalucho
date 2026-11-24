/**
 * Baja las fotos que subieron los jugadores por el formulario, las endereza,
 * las recorta centrando la cara y las guarda optimizadas en public/jugadores.
 *
 * La cara se detecta con el framework Vision de macOS (scripts/importar/
 * detectar-caras.swift): hace falta una Mac con Swift. Si no hay, o si en una
 * foto no se ve ninguna cara, se recorta por la zona más llamativa de la foto.
 *
 *   npm run fotos:arreglar            (solo las nuevas o cambiadas)
 *   npm run fotos:arreglar -- --todas (vuelve a procesar todas)
 *
 * Lee la planilla de GOOGLE_SHEET_ID (de .env.local). Después: commit de
 * public/jugadores y src/generated, y push.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import sharp from "sharp";
import { torneoConfig } from "../../src/config/torneo";
import { armarDatos } from "../../src/lib/datos/armar";
import { urlImagenDrive } from "../../src/lib/datos/formulario";
import { leerPlanilla } from "../../src/lib/datos/fuentes";
import { guardarManifiesto, leerManifiesto } from "./manifiesto";
import { calcularRecorte, caraPrincipal, estaDerecha, girosParaEnderezar, type Cara } from "./recorte";

const ejecutar = promisify(execFile);

const RAIZ = process.cwd();
const DESTINO = path.join(RAIZ, "public", "jugadores");
const MANIFIESTO = path.join(RAIZ, "src", "generated", "fotos-jugadores.json");
const DETECTOR = path.join(RAIZ, "scripts", "importar", "detectar-caras.swift");
const ANCHO_FINAL = 600;
const ALTO_FINAL = 750;

/** Caras de cada foto (por ruta). Devuelve null si no se pudo correr el detector. */
async function detectarCaras(rutas: string[]): Promise<Map<string, Cara[]> | null> {
  if (rutas.length === 0) return new Map();
  try {
    const { stdout } = await ejecutar("swift", [DETECTOR, ...rutas], { maxBuffer: 50 * 1024 * 1024, timeout: 600_000 });
    return new Map(Object.entries(JSON.parse(stdout) as Record<string, Cara[]>));
  } catch (error) {
    console.log(`No se pudo detectar caras (${(error as Error).message.split("\n")[0]}): se recorta por la zona más llamativa.`);
    return null;
  }
}

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
  const sinCara: string[] = [];
  const temporal = await mkdtemp(path.join(os.tmpdir(), "falucho-fotos-"));
  try {
    // 1) Bajar cada foto y enderezarla (el detector no mira la orientación EXIF).
    const bajadas: { jugador: (typeof pendientes)[number]; imagen: Buffer; ruta: string; ancho: number; alto: number; cara: Cara | null }[] = [];
    for (const j of pendientes) {
      try {
        const respuesta = await fetch(urlImagenDrive(j.fotoDriveId!, 1600), { signal: AbortSignal.timeout(30_000) });
        const tipo = respuesta.headers.get("content-type") ?? "";
        if (!respuesta.ok || !tipo.startsWith("image/")) {
          throw new Error(`Drive respondió ${respuesta.status} (${tipo || "sin tipo"}). ¿La foto es pública?`);
        }
        const { data, info } = await sharp(Buffer.from(await respuesta.arrayBuffer()))
          .rotate()
          .jpeg({ quality: 92 })
          .toBuffer({ resolveWithObject: true });
        const ruta = path.join(temporal, `${j.id}.jpg`);
        await writeFile(ruta, data);
        bajadas.push({ jugador: j, imagen: data, ruta, ancho: info.width, alto: info.height, cara: null });
      } catch (error) {
        console.log(`✗ ${j.nombre} (${j.id}): ${(error as Error).message}`);
      }
    }

    // 2) Detectar las caras de todas juntas.
    const caras = await detectarCaras(bajadas.map((b) => b.ruta));
    for (const b of bajadas) b.cara = caras ? caraPrincipal(caras.get(b.ruta) ?? []) : null;

    // 2b) Las fotos con la cara acostada se giran: se prueban los dos sentidos y
    // se queda el que deja la cara más derecha.
    const candidatas: { b: (typeof bajadas)[number]; giro: number; imagen: Buffer; ruta: string; ancho: number; alto: number }[] = [];
    for (const b of bajadas) {
      for (const giro of b.cara ? girosParaEnderezar(b.cara.roll ?? 0) : []) {
        const { data, info } = await sharp(b.imagen).rotate(giro).jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true });
        const ruta = path.join(temporal, `${b.jugador.id}.giro${giro}.jpg`);
        await writeFile(ruta, data);
        candidatas.push({ b, giro, imagen: data, ruta, ancho: info.width, alto: info.height });
      }
    }
    const carasGiradas = await detectarCaras(candidatas.map((c) => c.ruta));
    for (const b of bajadas) {
      const mejor = candidatas
        .filter((c) => c.b === b)
        .map((c) => ({ c, cara: carasGiradas ? caraPrincipal(carasGiradas.get(c.ruta) ?? []) : null }))
        .filter((x): x is { c: (typeof candidatas)[number]; cara: Cara } => x.cara !== null && estaDerecha(x.cara))
        .sort((x, y) => Math.abs(x.cara.roll ?? 0) - Math.abs(y.cara.roll ?? 0))[0];
      if (mejor) {
        Object.assign(b, { imagen: mejor.c.imagen, ruta: mejor.c.ruta, ancho: mejor.c.ancho, alto: mejor.c.alto, cara: mejor.cara });
        console.log(`↻ ${b.jugador.nombre}: foto girada ${mejor.c.giro}° para enderezarla`);
      }
    }

    // 3) Recortar centrando la cara y guardar.
    for (const { jugador: j, imagen, ancho, alto, cara } of bajadas) {
      try {
        const recorte = cara ? calcularRecorte(ancho, alto, cara) : null;
        const base = sharp(imagen);
        const info = await (recorte ? base.extract(recorte) : base)
          .resize({ width: ANCHO_FINAL, height: ALTO_FINAL, fit: "cover", position: sharp.strategy.attention })
          .webp({ quality: 78, effort: 5 })
          .toFile(path.join(DESTINO, `${j.id}.webp`));
        manifiesto[j.id] = j.fotoDriveId!;
        hechas++;
        bytes += info.size;
        if (!recorte) sinCara.push(j.nombre);
        console.log(`✓ ${j.nombre} (${j.id})${recorte ? "" : " · sin cara detectada"}`);
      } catch (error) {
        console.log(`✗ ${j.nombre} (${j.id}): ${(error as Error).message}`);
      }
    }
  } finally {
    await rm(temporal, { recursive: true, force: true });
  }
  await guardarManifiesto(MANIFIESTO, manifiesto);
  console.log(`\n${hechas} fotos arregladas (${Math.round(bytes / 1024)} KB).`);
  if (sinCara.length > 0) console.log(`Sin cara detectada (recorte por atención, revisalas): ${sinCara.join(", ")}`);
  if (hechas > 0) console.log("Para publicarlas: git add public/jugadores src/generated && git commit -m \"Fotos de jugadores\" && git push");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
