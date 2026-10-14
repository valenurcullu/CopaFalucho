/** Generador pseudoaleatorio con semilla (mulberry32): mismos datos en cada corrida. */
export function crearAzar(semilla: number) {
  let a = semilla >>> 0;
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1));
  return {
    siguiente,
    entero,
    elegir: <T>(lista: readonly T[]): T => lista[Math.floor(siguiente() * lista.length)],
    mezclar: <T>(lista: readonly T[]): T[] => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(siguiente() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
    /** Muestra de una distribución de Poisson (cantidad de goles, tarjetas…). */
    poisson: (lambda: number) => {
      const limite = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= siguiente();
      } while (p > limite);
      return k - 1;
    },
    /** Elige ponderando por peso. */
    ponderado: <T>(lista: readonly T[], peso: (x: T) => number): T => {
      const total = lista.reduce((s, x) => s + peso(x), 0);
      let r = siguiente() * total;
      for (const x of lista) {
        r -= peso(x);
        if (r <= 0) return x;
      }
      return lista[lista.length - 1];
    },
  };
}

export type Azar = ReturnType<typeof crearAzar>;
