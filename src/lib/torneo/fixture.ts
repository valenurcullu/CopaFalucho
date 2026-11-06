/**
 * Todos contra todos a una rueda (método del círculo). Con una cantidad impar
 * de equipos, en cada fecha uno queda libre.
 * Devuelve, por fecha, los cruces [local, visitante] y el equipo libre.
 */
export function todosContraTodos<T>(equipos: readonly T[]): { cruces: [T, T][]; libre: T | null }[] {
  const LIBRE = Symbol("libre");
  const lista: (T | typeof LIBRE)[] = equipos.length % 2 === 0 ? [...equipos] : [...equipos, LIBRE];
  const n = lista.length;
  if (n < 2) return [];
  const fechas: { cruces: [T, T][]; libre: T | null }[] = [];
  for (let ronda = 0; ronda < n - 1; ronda++) {
    const cruces: [T, T][] = [];
    let libre: T | null = null;
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a === LIBRE) libre = b as T;
      else if (b === LIBRE) libre = a as T;
      // Se alterna la localía para que nadie sea siempre local.
      else cruces.push((ronda + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    fechas.push({ cruces, libre });
    // Rota todos menos el primero.
    lista.splice(1, 0, lista.pop()!);
  }
  return fechas;
}
