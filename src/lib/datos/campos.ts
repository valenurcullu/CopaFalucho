import { z } from "zod";

/**
 * Helpers de zod para leer celdas de planilla. Todo llega como texto (CSV),
 * así que acá se limpia, se convierte y se valida con mensajes en castellano.
 */

const vacioANull = (v: unknown) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

export const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Texto obligatorio. */
export const texto = (campo: string) =>
  z.preprocess(vacioANull, z.string({ error: `Falta ${campo}` }));

/** Texto opcional: vacío → null. */
export const textoOpcional = () => z.preprocess(vacioANull, z.string().nullable());

/** Identificador: se compara en mayúsculas y sin espacios ("2001", "z01"). */
export const id = (campo: string) =>
  z.preprocess(
    (v) => {
      const s = vacioANull(v);
      return s === null ? null : s.replace(/\s+/g, "").toUpperCase();
    },
    z.string({ error: `Falta ${campo}` }),
  );

export const idOpcional = () =>
  z.preprocess((v) => {
    const s = vacioANull(v);
    return s === null ? null : s.replace(/\s+/g, "").toUpperCase();
  }, z.string().nullable());

function aNumero(v: unknown): unknown {
  const s = vacioANull(v);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : s;
}

export const entero = (campo: string, opciones: { min?: number; max?: number } = {}) =>
  z.preprocess(
    aNumero,
    z
      .number({ error: `${campo} tiene que ser un número` })
      .int({ error: `${campo} tiene que ser un número entero` })
      .min(opciones.min ?? -Infinity, { error: `${campo} es demasiado chico` })
      .max(opciones.max ?? Infinity, { error: `${campo} es demasiado grande` }),
  );

export const enteroOpcional = (campo: string, opciones: { min?: number; max?: number } = {}) =>
  z.preprocess(
    aNumero,
    z
      .number({ error: `${campo} tiene que ser un número` })
      .int({ error: `${campo} tiene que ser un número entero` })
      .min(opciones.min ?? -Infinity, { error: `${campo} es demasiado chico` })
      .max(opciones.max ?? Infinity, { error: `${campo} es demasiado grande` })
      .nullable(),
  );

export const decimalOpcional = (campo: string, opciones: { min: number; max: number }) =>
  z.preprocess(
    aNumero,
    z
      .number({ error: `${campo} tiene que ser un número` })
      .min(opciones.min, { error: `${campo} parece mal cargado (mínimo ${opciones.min})` })
      .max(opciones.max, { error: `${campo} parece mal cargado (máximo ${opciones.max})` })
      .nullable(),
  );

/** Acepta 15/12/2026, 15/12/26, 15-12-2026 y 2026-12-15. Devuelve ISO. */
export function parsearFecha(s: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const arg = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  let a: number, m: number, d: number;
  if (iso) [a, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (arg) [d, m, a] = [Number(arg[1]), Number(arg[2]), Number(arg[3].length === 2 ? `20${arg[3]}` : arg[3])];
  else return null;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const fechaOpcional = () =>
  z.preprocess(vacioANull, z.string().nullable()).transform((s, ctx) => {
    if (s === null) return null;
    const iso = parsearFecha(s);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: `Fecha inválida "${s}" (usá dd/mm/aaaa)` });
      return z.NEVER;
    }
    return iso;
  });

/** Acepta 18:30, 18.30, 18:30:00 y 18hs. Devuelve HH:MM. */
export function parsearHora(s: string): string | null {
  const m = /^(\d{1,2})(?:[:.h](\d{2}))?(?::\d{2})?\s*(?:hs?)?$/i.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export const horaOpcional = () =>
  z.preprocess(vacioANull, z.string().nullable()).transform((s, ctx) => {
    if (s === null) return null;
    const hora = parsearHora(s);
    if (!hora) {
      ctx.addIssue({ code: "custom", message: `Hora inválida "${s}" (usá hh:mm)` });
      return z.NEVER;
    }
    return hora;
  });

/**
 * Valor de una lista cerrada, tolerante a mayúsculas, acentos y espacios.
 * `alias` mapea variantes escritas a mano al valor canónico.
 */
export function opcion<T extends string>(campo: string, alias: Record<string, T>, porDefecto?: T) {
  const validos = [...new Set(Object.values(alias))].join(", ");
  return z.preprocess(vacioANull, z.string().nullable()).transform((s, ctx): T => {
    if (s === null) {
      if (porDefecto !== undefined) return porDefecto;
      ctx.addIssue({ code: "custom", message: `Falta ${campo}` });
      return z.NEVER;
    }
    const clave = sinAcentos(s).toLowerCase().replace(/[\s_-]+/g, " ").trim();
    const valor = alias[clave];
    if (!valor) {
      ctx.addIssue({ code: "custom", message: `${campo} "${s}" no es válido (opciones: ${validos})` });
      return z.NEVER;
    }
    return valor;
  });
}
