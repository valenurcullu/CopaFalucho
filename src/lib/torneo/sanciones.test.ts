import { describe, expect, it } from "vitest";
import type { Evento, Fase } from "@/domain/tipos";
import { calcularSanciones } from "./sanciones";

const reglas = { amarillasParaSuspension: 3, limpiarAmarillasEn: "semis" as const };

const partido = (id: string, fase: Fase = "zona", estado: "programado" | "finalizado" = "finalizado") => ({
  id, fase, estado, localId: "A", visitanteId: "B",
});

let n = 0;
const tarjeta = (partidoId: string, tipo: "amarilla" | "roja", jugadorId = "A-1", equipoId = "A"): Evento => ({
  id: `E${++n}`, partidoId, tipo, equipoId, jugadorId, minuto: null,
});

describe("calcularSanciones", () => {
  it("tres amarillas en partidos distintos dan una fecha, que se cumple en el partido siguiente", () => {
    const partidos = [partido("P1"), partido("P2"), partido("P3"), partido("P4", "cuartos", "programado")];
    const s = calcularSanciones(partidos, [tarjeta("P1", "amarilla"), tarjeta("P2", "amarilla"), tarjeta("P3", "amarilla")], reglas);
    expect(s).toEqual([
      { jugadorId: "A-1", equipoId: "A", motivo: "amarillas", partidoId: "P3", cumpleEnPartidoId: "P4", cumplida: false },
    ]);
  });

  it("dos amarillas no alcanzan", () => {
    expect(calcularSanciones([partido("P1"), partido("P2")], [tarjeta("P1", "amarilla"), tarjeta("P2", "amarilla")], reglas)).toEqual([]);
  });

  it("las amarillas se limpian al llegar a semis", () => {
    const partidos = [partido("P1"), partido("P2"), partido("S1", "semis"), partido("F", "final", "programado")];
    const s = calcularSanciones(partidos, [tarjeta("P1", "amarilla"), tarjeta("P2", "amarilla"), tarjeta("S1", "amarilla")], reglas);
    expect(s).toEqual([]);
  });

  it("doble amarilla en un partido es una fecha y no suma a la acumulación", () => {
    const partidos = [partido("P1"), partido("P2"), partido("P3")];
    const s = calcularSanciones(
      partidos,
      [tarjeta("P1", "amarilla"), tarjeta("P1", "amarilla"), tarjeta("P2", "amarilla")],
      reglas,
    );
    expect(s.map((x) => [x.motivo, x.partidoId, x.cumpleEnPartidoId, x.cumplida])).toEqual([["doble_amarilla", "P1", "P2", true]]);
  });

  it("amarilla más roja en el mismo partido cuenta como doble amarilla", () => {
    const s = calcularSanciones([partido("P1")], [tarjeta("P1", "amarilla"), tarjeta("P1", "roja")], reglas);
    expect(s[0]).toMatchObject({ motivo: "doble_amarilla", cumpleEnPartidoId: null, cumplida: false });
  });

  it("roja directa", () => {
    const s = calcularSanciones([partido("P1"), partido("P2", "zona", "programado")], [tarjeta("P1", "roja", "B-7", "B")], reglas);
    expect(s).toEqual([{ jugadorId: "B-7", equipoId: "B", motivo: "roja_directa", partidoId: "P1", cumpleEnPartidoId: "P2", cumplida: false }]);
  });
});
