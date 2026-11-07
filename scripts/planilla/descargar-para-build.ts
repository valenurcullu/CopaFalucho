/**
 * Corre antes de `next build` (script "prebuild"): baja la planilla una sola vez
 * para que el build no le pida lo mismo a Google desde cada proceso.
 * Sin GOOGLE_SHEET_ID no hace nada (el build usa los datos de ejemplo).
 */
import { loadEnvConfig } from "@next/env";
import { descargarPlanillaParaBuild } from "../../src/lib/datos/fuentes";

loadEnvConfig(process.cwd());
const id = process.env.GOOGLE_SHEET_ID?.trim();

if (!id) {
  console.log("Sin GOOGLE_SHEET_ID: el build usa los datos de ejemplo.");
} else {
  descargarPlanillaParaBuild(id)
    .then((hojas) => console.log(`Planilla bajada para el build: ${hojas.join(", ")}.`))
    .catch((error: Error) => {
      console.error(`No se pudo bajar la planilla: ${error.message}`);
      process.exit(1);
    });
}
