import { describe, expect, it } from "vitest";
import type { Evento } from "@/domain/tipos";
import { datoPorPosicion, estadisticasPorEquipo, promedioGol } from "./estadisticas";

const evento = (e: Partial<Evento> & Pick<Evento, "tipo" | "equipoId">): Evento =>
  ({ id: "e", partidoId: "Z01", jugadorId: null, minuto: null, fechasSancion: null, ...e });

describe("estadisticasPorEquipo", () => {
  const partidos = [
    { estado: "finalizado", localId: "A", visitanteId: "B", marcador: { local: 2, visitante: 0 } },
    { estado: "finalizado", localId: "B", visitanteId: "A", marcador: { local: 1, visitante: 1 } },
    // Sin jugar: no cuenta aunque tenga equipos.
    { estado: "programado", localId: "A", visitanteId: "C", marcador: null },
  ];

  it("suma partidos, goles y vallas invictas de los partidos finalizados", () => {
    const s = estadisticasPorEquipo(["A", "B", "C"], partidos, []);
    expect(s.A).toMatchObject({ pj: 2, gf: 3, gc: 1, vallasInvictas: 1 });
    expect(s.B).toMatchObject({ pj: 2, gf: 1, gc: 3, vallasInvictas: 0 });
    expect(s.C).toMatchObject({ pj: 0, gf: 0, gc: 0 });
  });

  it("cuenta las tarjetas desde los eventos", () => {
    const s = estadisticasPorEquipo(
      ["A", "B"],
      partidos,
      [evento({ tipo: "amarilla", equipoId: "A" }), evento({ tipo: "amarilla", equipoId: "A" }), evento({ tipo: "roja", equipoId: "B" }), evento({ tipo: "gol", equipoId: "A" })],
    );
    expect(s.A).toMatchObject({ amarillas: 2, rojas: 0 });
    expect(s.B).toMatchObject({ amarillas: 0, rojas: 1 });
  });

  it("ignora equipos que no están en la lista", () => {
    const s = estadisticasPorEquipo(["A"], partidos, [evento({ tipo: "roja", equipoId: "X" })]);
    expect(Object.keys(s)).toEqual(["A"]);
  });
});

describe("dato por posición", () => {
  it("promedio para mediocampistas y delanteros, vallas para arqueros y defensores", () => {
    expect(datoPorPosicion("Delantero")).toBe("promedio");
    expect(datoPorPosicion("Mediocampista")).toBe("promedio");
    expect(datoPorPosicion("Arquero")).toBe("vallas");
    expect(datoPorPosicion("defensor")).toBe("vallas");
    expect(datoPorPosicion(null)).toBeNull();
  });

  it("promedio de gol por partido del equipo", () => {
    expect(promedioGol(3, 4)).toBe(0.75);
    expect(promedioGol(0, 0)).toBeNull();
  });
});
