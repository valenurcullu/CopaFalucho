/**
 * Formatos de fecha y texto para la UI. Las fechas del torneo son "de
 * calendario" (sin zona horaria): se formatean en UTC para que el servidor y
 * el celular muestren lo mismo.
 */

const diaLargo = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const diaSemana = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" });

const aFecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sábado 28 de noviembre" */
export function formatearDia(iso: string | null): string {
  return iso ? capitalizar(diaLargo.format(aFecha(iso)).replace(",", "")) : "Fecha a confirmar";
}

/** "sáb 28/11" */
export function formatearDiaCorto(iso: string | null): string {
  if (!iso) return "A confirmar";
  const fecha = aFecha(iso);
  return `${diaSemana.format(fecha).replace(".", "")} ${fecha.getUTCDate()}/${fecha.getUTCMonth() + 1}`;
}

/** Fecha de hoy en Buenos Aires, en ISO. Solo para usar en el cliente. */
export function hoyEnBuenosAires(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

/** "hace 2 min", "hace 1 h", "recién". */
export function haceCuanto(desde: Date, ahora = new Date()): string {
  const segundos = Math.max(0, Math.round((ahora.getTime() - desde.getTime()) / 1000));
  if (segundos < 45) return "recién";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

/** "Juan Pérez “Coke”", o solo el nombre si no tiene apodo. */
export function nombreJugador(j: { nombre: string; apodo: string | null }): string {
  return j.apodo && j.apodo.toLowerCase() !== j.nombre.toLowerCase() ? `${j.nombre} “${j.apodo}”` : j.nombre;
}

/** Versión corta para listas apretadas: el apodo si tiene, si no el nombre. */
export const nombreCorto = (j: { nombre: string; apodo: string | null }) => j.apodo ?? j.nombre;

export const plural = (n: number, singular: string, pluralTexto = `${singular}s`) =>
  `${n} ${n === 1 ? singular : pluralTexto}`;
