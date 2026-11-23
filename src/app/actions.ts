"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_PLANILLA } from "@/lib/datos/fuentes";

/** Entre una actualización y otra, para no pedirle la planilla a Google una y otra vez. */
const ESPERA_MINIMA_MS = 15_000;
let ultima = 0;

/**
 * Botón "actualizar": descarta la planilla guardada y todas las pantallas
 * generadas, así la próxima vez que se abra cualquiera (esta o las demás) ya
 * se arma con los datos nuevos. Devuelve `omitido` si alguien actualizó recién.
 */
export async function actualizarTodo(): Promise<{ omitido: boolean }> {
  const ahora = Date.now();
  if (ahora - ultima < ESPERA_MINIMA_MS) return { omitido: true };
  ultima = ahora;
  updateTag(ETIQUETA_PLANILLA);
  revalidatePath("/", "layout");
  return { omitido: false };
}
