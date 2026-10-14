/**
 * Genera los íconos de la app (PWA, iPhone, favicon) a partir del escudo.
 * Uso: npm run iconos:generar  (después de cambiar el logo en assets/marca)
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { marca } from "../../src/config/marca";

const LOGO = path.join(process.cwd(), "assets", "marca", "logo-copa-falucho.png");
const PUBLICO = path.join(process.cwd(), "public", "iconos");
const APP = path.join(process.cwd(), "src", "app");

/** Escudo centrado sobre un fondo, ocupando `escala` del lado. */
async function icono(lado: number, fondo: string | null, escala: number, destino: string) {
  const alto = Math.round(lado * escala);
  const logo = await sharp(LOGO).resize({ height: alto, width: alto, fit: "inside" }).toBuffer();
  await sharp({
    create: { width: lado, height: lado, channels: 4, background: fondo ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(destino);
  console.log(`✓ ${path.relative(process.cwd(), destino)}`);
}

async function main() {
  await mkdir(PUBLICO, { recursive: true });
  const fondo = marca.colores.claro.marca;
  // "any": escudo sobre transparente. "maskable": con margen seguro del 20% sobre color de marca.
  await icono(192, null, 0.94, path.join(PUBLICO, "icono-192.png"));
  await icono(512, null, 0.94, path.join(PUBLICO, "icono-512.png"));
  await icono(192, fondo, 0.62, path.join(PUBLICO, "icono-maskable-192.png"));
  await icono(512, fondo, 0.62, path.join(PUBLICO, "icono-maskable-512.png"));
  // iOS no admite transparencia: fondo de marca.
  await icono(180, fondo, 0.78, path.join(APP, "apple-icon.png"));
  await icono(64, null, 1, path.join(APP, "icon.png"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
