import { sinAcentos } from "./campos";
import type { FilaCruda } from "./csv";

/**
 * Respuestas del Google Form de jugadores (pestaña "Formulario" de la planilla).
 * Las columnas tienen el texto de cada pregunta, así que se buscan por cómo
 * empiezan ("Peso (kg)" → peso). Ver scripts/google/formulario-jugadores.gs.
 */
export interface RespuestaFormulario {
  /** Fila en la planilla, para los avisos. */
  fila: number;
  nombre: string;
  apellido: string;
  apodo: string | null;
  categoria: string;
  posicion: string | null;
  pesoKg: number | null;
  alturaCm: number | null;
  /** Link de Drive a la foto, ya convertido a uno que se puede mostrar. */
  fotoUrl: string | null;
  /** Id del archivo en Drive (para que el script de fotos lo baje). */
  fotoDriveId: string | null;
  autoriza: boolean;
  oculta: boolean;
}

export interface ProblemaFormulario {
  fila: number;
  mensaje: string;
}

const PREGUNTAS = {
  nombre: ["nombre"],
  apellido: ["apellido"],
  apodo: ["apodo"],
  categoria: ["categoria", "equipo", "clase"],
  posicion: ["posicion"],
  peso: ["peso"],
  altura: ["altura"],
  foto: ["foto"],
  autoriza: ["autoriz", "acepto", "consentimiento"],
  oculta: ["ocultar", "oculto"],
} as const;

type Pregunta = keyof typeof PREGUNTAS;

const clave = (s: string) => sinAcentos(s).toLowerCase().trim();

/** Columna de la planilla que corresponde a cada pregunta, según cómo empieza su título. */
function columnasDe(encabezados: readonly string[]): Partial<Record<Pregunta, string>> {
  const resultado: Partial<Record<Pregunta, string>> = {};
  for (const [pregunta, prefijos] of Object.entries(PREGUNTAS) as [Pregunta, readonly string[]][]) {
    const columna = encabezados.find((e) => prefijos.some((p) => clave(e).startsWith(p)));
    if (columna) resultado[pregunta] = columna;
  }
  return resultado;
}

/** true si la tabla parece de respuestas del formulario de jugadores. */
export function esFormularioDeJugadores(encabezados: readonly string[]): boolean {
  const c = columnasDe(encabezados);
  return !!(c.nombre && c.apellido && c.categoria);
}

/** Id de un archivo de Drive a partir de los links que guarda Google Forms. */
export function idDeDrive(link: string): string | null {
  const m = /[?&]id=([\w-]{10,})/.exec(link) ?? /\/d\/([\w-]{10,})/.exec(link);
  return m?.[1] ?? null;
}

/** Link de una imagen de Drive que se puede mostrar en la web (el archivo tiene que ser público). */
export const urlImagenDrive = (id: string, ancho = 800) => `https://drive.google.com/thumbnail?id=${id}&sz=w${ancho}`;

function numero(texto: string | undefined, min: number, max: number): number | null {
  if (!texto) return null;
  const n = Number(texto.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

const capitalizar = (s: string) => s.trim().replace(/\s+/g, " ").replace(/(^|[\s-])\S/g, (l) => l.toUpperCase());

/**
 * Lee las respuestas. Si una misma persona (nombre + apellido + categoría)
 * respondió varias veces, queda la última: así puede corregir sus datos o su foto.
 */
export function leerRespuestas(filas: readonly FilaCruda[]): { respuestas: RespuestaFormulario[]; problemas: ProblemaFormulario[] } {
  const problemas: ProblemaFormulario[] = [];
  if (filas.length === 0) return { respuestas: [], problemas };
  const col = columnasDe(Object.keys(filas[0]));
  const valor = (fila: FilaCruda, pregunta: Pregunta) => {
    const c = col[pregunta];
    return c ? (fila[c] ?? "").trim() : "";
  };

  const porPersona = new Map<string, RespuestaFormulario>();
  filas.forEach((fila, i) => {
    const numeroFila = i + 2;
    const nombre = valor(fila, "nombre");
    const apellido = valor(fila, "apellido");
    const categoria = valor(fila, "categoria");
    if (!nombre && !apellido && !categoria) return;
    if (!nombre || !apellido || !categoria) {
      problemas.push({ fila: numeroFila, mensaje: "Falta el nombre, el apellido o la categoría" });
      return;
    }
    const linkFoto = valor(fila, "foto").split(/[,\s]+/)[0] ?? "";
    const fotoDriveId = linkFoto ? idDeDrive(linkFoto) : null;
    const pesoTexto = valor(fila, "peso");
    const alturaTexto = valor(fila, "altura");
    const pesoKg = numero(pesoTexto, 35, 200);
    const alturaCm = numero(alturaTexto, 120, 230);
    if (pesoTexto && pesoKg === null) problemas.push({ fila: numeroFila, mensaje: `Peso "${pesoTexto}" fuera de rango: no se muestra` });
    if (alturaTexto && alturaCm === null) problemas.push({ fila: numeroFila, mensaje: `Altura "${alturaTexto}" fuera de rango: no se muestra` });

    const respuesta: RespuestaFormulario = {
      fila: numeroFila,
      nombre: capitalizar(nombre),
      apellido: capitalizar(apellido),
      apodo: valor(fila, "apodo") || null,
      categoria,
      posicion: valor(fila, "posicion") || null,
      pesoKg,
      alturaCm,
      fotoUrl: fotoDriveId ? urlImagenDrive(fotoDriveId) : null,
      fotoDriveId,
      // Si el formulario no tiene la pregunta de autorización, se asume que sí.
      autoriza: col.autoriza ? valor(fila, "autoriza") !== "" : true,
      oculta: valor(fila, "oculta") !== "",
    };
    porPersona.set(clave(`${respuesta.nombre} ${respuesta.apellido}|${categoria}`), respuesta);
  });
  return { respuestas: [...porPersona.values()], problemas };
}
