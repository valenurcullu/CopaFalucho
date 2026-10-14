import { describe, expect, it } from "vitest";
import type { CriterioDesempate } from "@/domain/config";
import { calcularMarcador, ganadorDe } from "./marcador";
import { calcularTabla, type PartidoTabla } from "./tablas";
import type { Evento } from "@/domain/tipos";

const reglas = (desempate: CriterioDesempate[] = ["diferencia_gol", "goles_a_favor", "fair_play"]) => ({
  puntos: { victoria: 3, empate: 1, derrota: 0 },
  desempate,
  fairPlay: { amarilla: 1, roja: 3 },
});

let n = 0;
const p = (localId: string, gl: number, gv: number, visitanteId: string): PartidoTabla => ({
  id: `P${++n}`,
  localId,
  visitanteId,
  marcador: { local: gl, visitante: gv },
});

const tarjeta = (equipoId: string, tipo: "amarilla" | "roja") => ({ equipoId, tipo });
const orden = (filas: { equipoId: string }[]) => filas.map((f) => f.equipoId);

describe("calcularMarcador", () => {
  const ev = (tipo: Evento["tipo"], equipoId: string): Evento => ({ id: "x", partidoId: "Z1", tipo, equipoId, jugadorId: null, minuto: 1 });

  it("cuenta goles por equipo e ignora tarjetas", () => {
    expect(calcularMarcador("A", "B", [ev("gol", "A"), ev("gol", "A"), ev("amarilla", "B"), ev("gol", "B")])).toEqual({ local: 2, visitante: 1 });
  });

  it("un gol en contra suma para el rival", () => {
    expect(calcularMarcador("A", "B", [ev("gol_en_contra", "A")])).toEqual({ local: 0, visitante: 1 });
  });
});

describe("ganadorDe", () => {
  const base = { localId: "A", visitanteId: "B", estado: "finalizado" as const, penalesLocal: null, penalesVisitante: null };

  it("gana el que hizo más goles", () => {
    expect(ganadorDe(base, { local: 0, visitante: 2 })).toBe("B");
  });

  it("si empataron, definen los penales", () => {
    expect(ganadorDe({ ...base, penalesLocal: 4, penalesVisitante: 3 }, { local: 1, visitante: 1 })).toBe("A");
  });

  it("sin penales cargados no hay ganador", () => {
    expect(ganadorDe(base, { local: 1, visitante: 1 })).toBeNull();
  });

  it("un partido en juego no tiene ganador", () => {
    expect(ganadorDe({ ...base, estado: "en_juego" }, { local: 3, visitante: 0 })).toBeNull();
  });
});

describe("calcularTabla", () => {
  it("suma puntos, goles y partidos", () => {
    const tabla = calcularTabla(["A", "B", "C"], [p("A", 2, 0, "B"), p("B", 1, 1, "C"), p("C", 0, 3, "A")], [], reglas());
    expect(tabla[0]).toMatchObject({ equipoId: "A", pj: 2, pg: 2, pts: 6, gf: 5, gc: 0, dg: 5, posicion: 1 });
    expect(tabla[1]).toMatchObject({ equipoId: "B", pe: 1, pp: 1, pts: 1, dg: -2 });
    expect(tabla[2]).toMatchObject({ equipoId: "C", pe: 1, pp: 1, pts: 1, dg: -3 });
  });

  it("un equipo sin partidos aparece con todo en cero", () => {
    const tabla = calcularTabla(["A", "B", "C"], [p("A", 1, 0, "B")], [], reglas());
    expect(tabla.find((f) => f.equipoId === "C")).toMatchObject({ pj: 0, pts: 0 });
  });

  it("desempata por diferencia de gol", () => {
    const tabla = calcularTabla(["A", "B", "C"], [p("A", 1, 0, "C"), p("B", 4, 0, "C")], [], reglas());
    expect(orden(tabla)).toEqual(["B", "A", "C"]);
  });

  it("con igual diferencia, desempata por goles a favor", () => {
    const tabla = calcularTabla(["A", "B", "C"], [p("A", 1, 0, "C"), p("B", 3, 2, "C")], [], reglas());
    expect(orden(tabla)).toEqual(["B", "A", "C"]);
  });

  it("con igual diferencia y goles, desempata por fair play (menos es mejor)", () => {
    const tabla = calcularTabla(
      ["A", "B", "C"],
      [p("A", 2, 1, "C"), p("B", 2, 1, "C")],
      [tarjeta("A", "roja"), tarjeta("B", "amarilla"), tarjeta("B", "amarilla")],
      reglas(),
    );
    expect(orden(tabla)).toEqual(["B", "A", "C"]);
    expect(tabla.find((f) => f.equipoId === "A")).toMatchObject({ rojas: 1, fairPlay: 3 });
    expect(tabla.find((f) => f.equipoId === "B")).toMatchObject({ amarillas: 2, fairPlay: 2 });
  });

  it("respeta el orden de criterios configurado", () => {
    // A: dg +1, gf 4. B: dg +2, gf 2.
    const partidos = [p("A", 4, 3, "C"), p("B", 2, 0, "C")];
    expect(orden(calcularTabla(["A", "B", "C"], partidos, [], reglas(["diferencia_gol", "goles_a_favor"])))).toEqual(["B", "A", "C"]);
    expect(orden(calcularTabla(["A", "B", "C"], partidos, [], reglas(["goles_a_favor", "diferencia_gol"])))).toEqual(["A", "B", "C"]);
  });

  it("un criterio que separa a uno deja al resto empatado para el siguiente", () => {
    // A, B y C con 3 puntos. A tiene mejor dg; B y C igualan dg y gf; C tiene menos tarjetas.
    const partidos = [p("A", 3, 0, "D"), p("B", 1, 0, "D"), p("C", 1, 0, "D"), p("D", 1, 0, "A"), p("D", 1, 0, "B"), p("D", 1, 0, "C")];
    const tabla = calcularTabla(["A", "B", "C", "D"], partidos, [tarjeta("B", "amarilla")], reglas());
    expect(orden(tabla)).toEqual(["D", "A", "C", "B"]);
  });

  it("si el enfrentamiento directo también está igualado, no resuelve", () => {
    const tabla = calcularTabla(["A", "B"], [p("B", 1, 0, "A"), p("A", 1, 0, "B")], [], reglas(["enfrentamiento_directo"]));
    expect(tabla.every((f) => f.empateSinResolver)).toBe(true);
  });

  it("enfrentamiento directo decide antes que la diferencia de gol general", () => {
    // A: 6 pts, dg +4 (le ganó 5-0 a C y perdió con B). B: 6 pts, dg +1, le ganó a A.
    const partidos = [p("A", 5, 0, "C"), p("B", 1, 0, "A"), p("B", 0, 1, "D"), p("A", 1, 0, "D"), p("B", 1, 0, "C")];
    const tabla = calcularTabla(["A", "B", "C", "D"], partidos, [], reglas(["enfrentamiento_directo", "diferencia_gol"]));
    expect(orden(tabla).slice(0, 2)).toEqual(["B", "A"]);
    const sinDirecto = calcularTabla(["A", "B", "C", "D"], partidos, [], reglas(["diferencia_gol"]));
    expect(orden(sinDirecto).slice(0, 2)).toEqual(["A", "B"]);
  });

  it("marca el empate sin resolver cuando todos los criterios igualan", () => {
    const tabla = calcularTabla(["A", "B", "C"], [p("A", 1, 1, "B")], [], reglas());
    const a = tabla.find((f) => f.equipoId === "A")!;
    const b = tabla.find((f) => f.equipoId === "B")!;
    expect(a.empateSinResolver && b.empateSinResolver).toBe(true);
    expect(tabla.find((f) => f.equipoId === "C")!.empateSinResolver).toBe(false);
    expect(tabla.map((f) => f.posicion)).toEqual([1, 2, 3]);
  });

  it("usa los puntos configurados", () => {
    const tabla = calcularTabla(["A", "B"], [p("A", 1, 1, "B")], [], { ...reglas(), puntos: { victoria: 2, empate: 1, derrota: 0 } });
    expect(tabla.every((f) => f.pts === 1)).toBe(true);
    const otra = calcularTabla(["A", "B"], [p("A", 1, 0, "B")], [], { ...reglas(), puntos: { victoria: 2, empate: 1, derrota: 0 } });
    expect(otra[0].pts).toBe(2);
  });
});
