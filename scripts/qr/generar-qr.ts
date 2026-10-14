/**
 * Genera el QR de la app y un cartel A4 listo para imprimir y pegar en la cancha.
 *
 *   npm run qr -- https://copa-falucho.vercel.app
 *
 * Deja en qr/: qr.svg (para imprimir en cualquier tamaño), qr.png y cartel.png.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { marca } from "../../src/config/marca";
import { torneoConfig } from "../../src/config/torneo";

const CARPETA = path.join(process.cwd(), "qr");
// A4 a 150 ppp: suficiente para imprimir nítido.
const ANCHO = 1240;
const ALTO = 1754;

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  const url = process.argv[2];
  if (!url || !/^https?:\/\//.test(url)) {
    console.error("Uso: npm run qr -- https://tu-app.vercel.app");
    process.exit(1);
  }
  await mkdir(CARPETA, { recursive: true });

  // Corrección de errores alta: el QR se sigue leyendo aunque se ensucie o se doble.
  const opciones = { errorCorrectionLevel: "H" as const, margin: 2, color: { dark: "#12122A", light: "#FFFFFF" } };
  const svg = await QRCode.toString(url, { ...opciones, type: "svg" });
  await writeFile(path.join(CARPETA, "qr.svg"), svg);
  await QRCode.toFile(path.join(CARPETA, "qr.png"), url, { ...opciones, width: 1200 });

  const ladoQr = 820;
  const qr = await QRCode.toBuffer(url, { ...opciones, width: ladoQr });
  const logo = await sharp(await readFile(path.join(process.cwd(), "assets", "marca", "logo-copa-falucho.png")))
    .resize({ height: 380 })
    .toBuffer();
  const anchoLogo = (await sharp(logo).metadata()).width!;
  const { marca: azul, acento } = marca.colores.claro;
  const dominio = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const fondo = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
      <rect width="100%" height="100%" fill="${azul}"/>
      <rect x="40" y="40" width="${ANCHO - 80}" height="${ALTO - 80}" rx="48" fill="none" stroke="${acento}" stroke-width="10"/>
      <text x="50%" y="560" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-weight="800" font-size="96" fill="#FFFFFF" letter-spacing="4">${escapar(marca.nombreTorneo.toUpperCase())} ${torneoConfig.edicion}</text>
      <text x="50%" y="625" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="${acento}">${escapar(marca.club)}</text>
      <rect x="${(ANCHO - ladoQr) / 2 - 30}" y="${680 - 30}" width="${ladoQr + 60}" height="${ladoQr + 60}" rx="36" fill="#FFFFFF"/>
      <text x="50%" y="1600" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="52" fill="#FFFFFF">Escaneá y seguí el torneo</text>
      <text x="50%" y="1665" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" fill="${acento}">Fixture · Tablas · Llaves · Goleadores · ${escapar(dominio)}</text>
    </svg>`);

  await sharp(fondo)
    .composite([
      { input: logo, top: 70, left: Math.round((ANCHO - anchoLogo) / 2) },
      { input: qr, top: 680, left: Math.round((ANCHO - ladoQr) / 2) },
    ])
    .png()
    .toFile(path.join(CARPETA, "cartel.png"));

  console.log(`✓ QR para ${url}`);
  console.log("  qr/qr.svg      → para imprimir en cualquier tamaño");
  console.log("  qr/qr.png      → para mandar por WhatsApp o redes");
  console.log("  qr/cartel.png  → cartel A4 para pegar en la cancha");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
