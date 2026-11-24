/** Caja de una cara detectada, en píxeles y con el origen arriba a la izquierda. */
export interface Cara {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Inclinación de la cara en radianes (0 = derecha). */
  roll?: number;
}

export interface Recorte {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Ancho / alto de la foto de la figurita (4:5). */
export const PROPORCION = 4 / 5;
/** El recorte mide esta cantidad de veces el alto de la cara: queda cabeza y hombros. */
const ALTO_RECORTE_POR_CARA = 3.4;
/** El centro de la cara queda a esta altura del recorte (0 = arriba), así queda lugar para la franja del nombre. */
const CARA_DESDE_ARRIBA = 0.4;

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));

/** Desde esta inclinación (unos 40°) se prueba enderezar la foto. */
const INCLINACION_MAXIMA = 0.7;

/**
 * Giros (en grados, en sentido horario) que se prueban para enderezar una foto
 * con la cara acostada. Se prueban los dos sentidos y se queda el que deja la
 * cara más derecha: así no depende de cómo Vision defina el signo del ángulo.
 */
export function girosParaEnderezar(roll: number): number[] {
  if (Math.abs(roll) <= INCLINACION_MAXIMA) return [];
  const giro = (Math.round((-roll * 180) / Math.PI / 90) * 90) % 360;
  if (giro === 0) return [];
  const opuesto = ((-giro % 360) + 360) % 360;
  const normal = ((giro % 360) + 360) % 360;
  return [...new Set([normal, opuesto])];
}

/** La cara está derecha si casi no está inclinada. */
export const estaDerecha = (cara: Cara) => Math.abs(cara.roll ?? 0) < 0.5;

/** Si hay varias caras (gente al fondo), la del jugador es la más grande. */
export function caraPrincipal(caras: readonly Cara[]): Cara | null {
  return caras.reduce<Cara | null>((mayor, c) => (!mayor || c.ancho * c.alto > mayor.ancho * mayor.alto ? c : mayor), null);
}

/**
 * Recuadro 4:5 de la foto que deja la cara centrada de lado a lado y un poco
 * arriba del medio. Nunca se sale de la foto: si la cara es muy grande, el
 * recorte es la foto entera (en 4:5) y se centra lo más posible.
 */
export function calcularRecorte(anchoFoto: number, altoFoto: number, cara: Cara): Recorte {
  let alto = cara.alto * ALTO_RECORTE_POR_CARA;
  let ancho = alto * PROPORCION;
  const escala = Math.min(1, anchoFoto / ancho, altoFoto / alto);
  ancho *= escala;
  alto *= escala;

  const left = Math.round(limitar(cara.x + cara.ancho / 2 - ancho / 2, 0, anchoFoto - ancho));
  const top = Math.round(limitar(cara.y + cara.alto / 2 - alto * CARA_DESDE_ARRIBA, 0, altoFoto - alto));
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(ancho), anchoFoto - left)),
    height: Math.max(1, Math.min(Math.round(alto), altoFoto - top)),
  };
}
