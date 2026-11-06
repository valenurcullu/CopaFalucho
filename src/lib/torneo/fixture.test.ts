import { describe, expect, it } from "vitest";
import { todosContraTodos } from "./fixture";

function verificar(n: number) {
  const equipos = Array.from({ length: n }, (_, i) => `E${i + 1}`);
  const fechas = todosContraTodos(equipos);
  const cruces = fechas.flatMap((f) => f.cruces.map(([a, b]) => [a, b].sort().join("-")));
  return { equipos, fechas, cruces };
}

describe("todosContraTodos", () => {
  it("zona de 5: 5 fechas de 2 partidos, uno libre por fecha y todos se cruzan una vez", () => {
    const { equipos, fechas, cruces } = verificar(5);
    expect(fechas).toHaveLength(5);
    expect(fechas.every((f) => f.cruces.length === 2 && f.libre !== null)).toBe(true);
    expect(new Set(fechas.map((f) => f.libre))).toEqual(new Set(equipos));
    expect(cruces).toHaveLength(10);
    expect(new Set(cruces).size).toBe(10);
  });

  it("zona de 4: 3 fechas de 2 partidos, sin libres", () => {
    const { fechas, cruces } = verificar(4);
    expect(fechas).toHaveLength(3);
    expect(fechas.every((f) => f.libre === null)).toBe(true);
    expect(new Set(cruces).size).toBe(6);
  });

  it("nadie juega dos veces en la misma fecha", () => {
    for (const n of [3, 5, 6, 7]) {
      for (const f of verificar(n).fechas) {
        const jugando = f.cruces.flat();
        expect(new Set(jugando).size).toBe(jugando.length);
      }
    }
  });
});
