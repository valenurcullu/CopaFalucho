import { describe, expect, it } from "vitest";
import type { Evento, Fase } from "@/domain/tipos";
import { calcularSanciones, textoMotivo } from "./sanciones";

const reglas = { amarillasParaSuspension: 3, limpiarAmarillasEn: "semis" as const };

const partido = (id: string, fase: Fase = "zona", estado: "programado" | "finalizado" = "finalizado") => ({
  id, fase, estado, localId: "A", visitanteId: "B",
});

let n = 0;
const tarjeta = (partidoId: string, tipo: "amarilla" | "roja", jugadorId = "A-1", equipoId = "A", fechasSancion: number | null = null): Evento => ({
  id: `E${++n}`, partidoId, tipo, equipoId, jugadorId, minuto: null, fechasSancion,
});

describe("calcularSanciones", () => {
  it("tres amarillas en partidos distintos dan una fecha, que se cumple en el partido siguiente", () => {
    const partidos = [partido("P1"), partido("P2"), partido("P3"), partido("P4", "cuartos", "programado")];
    const s = calcularSanciones(partidos, [tarjeta("P1", "amarilla"), tarjeta("P2", "amarilla"), tarjeta("P3", "amarilla")], reglas);
    expect(s).toEqual([
      {
        jugadorId: "A-1", equipoId: "A", motivo: "amarillas", fechas: 1, aDefinir: false,
        partidoId: "P3", cumpleEnPartidoId: "P4", fechasCumplidas: 0, cumplida: false,
      },
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
    expect(s.map((x) => [x.motivo, x.partidoId, x.cumpleEnPartidoId, x.cumplida])).toEqual([["doble_amarilla", "P1", null, true]]);
  });

  it("amarilla más roja en el mismo partido cuenta como doble amarilla", () => {
    const s = calcularSanciones([partido("P1")], [tarjeta("P1", "amarilla"), tarjeta("P1", "roja")], reglas);
    expect(s[0]).toMatchObject({ motivo: "doble_amarilla", cumpleEnPartidoId: null, cumplida: false });
  });

  it("roja directa sin fechas cargadas: 1 fecha a definir por la comisión", () => {
    const s = calcularSanciones([partido("P1"), partido("P2", "zona", "programado")], [tarjeta("P1", "roja", "B-7", "B")], reglas);
    expect(s[0]).toMatchObject({ jugadorId: "B-7", equipoId: "B", motivo: "roja_directa", fechas: 1, aDefinir: true, cumpleEnPartidoId: "P2" });
  });

  it("roja directa con las fechas que cargó la comisión", () => {
    const partidos = [partido("P1"), partido("P2"), partido("P3", "cuartos", "programado"), partido("P4", "semis", "programado")];
    const s = calcularSanciones(partidos, [tarjeta("P1", "roja", "A-1", "A", 3)], reglas);
    expect(s[0]).toMatchObject({ fechas: 3, aDefinir: false, fechasCumplidas: 1, cumpleEnPartidoId: "P3", cumplida: false });
  });

  describe("sanciones cargadas a mano", () => {
    const manual = (fechas: number, desdePartidoId: string | null = null) => ({
      equipoId: "A", jugadorId: "A-1", fechas, motivo: null, desdePartidoId,
    });

    it("suspenden desde el primer partido del equipo", () => {
      const partidos = [partido("P1", "zona", "programado"), partido("P2", "zona", "programado")];
      const [s] = calcularSanciones(partidos, [], reglas, [manual(1)]);
      expect(s).toMatchObject({ motivo: "manual", fechas: 1, cumpleEnPartidoId: "P1", fechasCumplidas: 0, cumplida: false, aDefinir: false });
      expect(textoMotivo(s)).toBe("Sanción de la comisión: 1 fecha");
    });

    it("se cumplen cuando el equipo juega los partidos de la suspensión", () => {
      const partidos = [partido("P1"), partido("P2", "zona", "programado"), partido("P3", "zona", "programado")];
      const [s] = calcularSanciones(partidos, [], reglas, [manual(2)]);
      expect(s).toMatchObject({ fechasCumplidas: 1, cumpleEnPartidoId: "P2", cumplida: false });
      const [hecha] = calcularSanciones([partido("P1"), partido("P2")], [], reglas, [manual(2)]);
      expect(hecha).toMatchObject({ cumplida: true, cumpleEnPartidoId: null });
    });

    it("pueden empezar en un partido puntual y llevar un motivo", () => {
      const partidos = [partido("P1"), partido("P2", "zona", "programado"), partido("P3", "zona", "programado")];
      const [s] = calcularSanciones(partidos, [], reglas, [{ ...manual(1, "P3"), motivo: "Roja del torneo anterior" }]);
      expect(s).toMatchObject({ cumpleEnPartidoId: "P3", cumplida: false });
      expect(textoMotivo(s)).toBe("Roja del torneo anterior: 1 fecha");
    });

    it("conviven con las que salen de las tarjetas", () => {
      const partidos = [partido("P1"), partido("P2", "zona", "programado")];
      const s = calcularSanciones(partidos, [tarjeta("P1", "roja", "A-2", "A", 1)], reglas, [manual(1)]);
      expect(s.map((x) => x.motivo).sort()).toEqual(["manual", "roja_directa"]);
    });
  });

  it("una suspensión de 20 fechas o más se muestra como suspendido del torneo", () => {
    expect(textoMotivo({ motivo: "roja_directa", fechas: 50, aDefinir: false })).toBe("Roja directa: suspendido del torneo");
    expect(textoMotivo({ motivo: "roja_directa", fechas: 2, aDefinir: false })).toBe("Roja directa: 2 fechas");
    expect(textoMotivo({ motivo: "manual", fechas: 50, aDefinir: false, detalle: "Expulsado" })).toBe("Expulsado: suspendido del torneo");
  });
});
