import { describe, expect, it } from "vitest";
import type { LlaveConfig, OrigenLlave } from "@/domain/config";
import { ErrorFormato, llavesEstandar, resolverLlaves, type ResultadoLlave } from "./llaves";

const texto = (o: OrigenLlave) =>
  o.tipo === "posicion" ? `${o.puesto}${o.zona}` : `${o.tipo === "ganador" ? "G" : "P"}-${o.llave}`;
const cruces = (llaves: LlaveConfig[]) => llaves.map((l) => `${l.id}: ${texto(l.local)} v ${texto(l.visitante)}`);

describe("llavesEstandar", () => {
  it("4 zonas, 2 por zona: cuartos cruzados y los de la misma zona solo se ven en la final", () => {
    expect(cruces(llavesEstandar(["A", "B", "C", "D"], 2))).toEqual([
      "C1: 1A v 2B",
      "C2: 1C v 2D",
      "C3: 1B v 2A",
      "C4: 1D v 2C",
      "S1: G-C1 v G-C2",
      "S2: G-C3 v G-C4",
      "F: G-S1 v G-S2",
    ]);
  });

  it("2 zonas, 2 por zona: semis y final", () => {
    expect(cruces(llavesEstandar(["A", "B"], 2))).toEqual(["S1: 1A v 2B", "S2: 1B v 2A", "F: G-S1 v G-S2"]);
  });

  it("4 zonas, 1 por zona: semis entre ganadores", () => {
    expect(cruces(llavesEstandar(["A", "B", "C", "D"], 1))).toEqual(["S1: 1A v 1B", "S2: 1C v 1D", "F: G-S1 v G-S2"]);
  });

  it("8 zonas, 2 por zona: octavos", () => {
    const llaves = llavesEstandar(["A", "B", "C", "D", "E", "F", "G", "H"], 2);
    expect(llaves.filter((l) => l.fase === "octavos")).toHaveLength(8);
    expect(llaves.filter((l) => l.fase === "cuartos")).toHaveLength(4);
    expect(cruces(llaves)[0]).toBe("O1: 1A v 2B");
    expect(llaves.at(-1)!.id).toBe("F");
  });

  it("2 zonas, 4 por zona: siembra general", () => {
    expect(cruces(llavesEstandar(["A", "B"], 4)).slice(0, 4)).toEqual([
      "C1: 1A v 4B",
      "C2: 2B v 3A",
      "C3: 1B v 4A",
      "C4: 2A v 3B",
    ]);
  });

  it("una sola zona con 2 clasificados: final directa", () => {
    expect(cruces(llavesEstandar(["A"], 2))).toEqual(["F: 1A v 2A"]);
  });

  it("agrega el partido por el tercer puesto", () => {
    const tercero = llavesEstandar(["A", "B", "C", "D"], 2, true).find((l) => l.fase === "tercer_puesto");
    expect(tercero && `${texto(tercero.local)} v ${texto(tercero.visitante)}`).toBe("P-S1 v P-S2");
  });

  it("rechaza cantidades que no arman un cuadro", () => {
    expect(() => llavesEstandar(["A", "B", "C"], 2)).toThrow(ErrorFormato);
  });

  it("sin clasificados suficientes no hay llaves", () => {
    expect(llavesEstandar(["A"], 1)).toEqual([]);
  });
});

describe("resolverLlaves", () => {
  const llaves = llavesEstandar(["A", "B", "C", "D"], 2, true);
  const posiciones: Record<string, string[]> = {
    A: ["A1", "A2", "A3", "A4"],
    B: ["B1", "B2", "B3", "B4"],
    C: ["C1", "C2", "C3", "C4"],
    D: ["D1", "D2", "D3", "D4"],
  };
  const enPuesto = (zona: string, puesto: number) => posiciones[zona][puesto - 1];

  /** Gana siempre el local, salvo las llaves indicadas. */
  const resultados =
    (ganaVisitante: string[] = [], sinJugar: string[] = []) =>
    (id: string, local: string, visitante: string): ResultadoLlave => {
      if (sinJugar.includes(id)) return { ganadorId: null, perdedorId: null };
      return ganaVisitante.includes(id) ? { ganadorId: visitante, perdedorId: local } : { ganadorId: local, perdedorId: visitante };
    };

  it("completa el cuadro con posiciones y ganadores", () => {
    const r = resolverLlaves(llaves, enPuesto, resultados(["C2", "S1"]));
    const de = (id: string) => r.find((l) => l.config.id === id)!;
    expect([de("C1").localId, de("C1").visitanteId]).toEqual(["A1", "B2"]);
    expect([de("S1").localId, de("S1").visitanteId]).toEqual(["A1", "D2"]);
    expect([de("F").localId, de("F").visitanteId]).toEqual(["D2", "B1"]);
    expect([de("T").localId, de("T").visitanteId]).toEqual(["A1", "D1"]);
  });

  it("deja lugares vacíos con etiquetas mientras no se definen", () => {
    const r = resolverLlaves(llaves, (zona, puesto) => (zona === "A" ? null : enPuesto(zona, puesto)), resultados([], ["C2"]));
    const de = (id: string) => r.find((l) => l.config.id === id)!;
    expect(de("C1").localId).toBeNull();
    expect(de("C1").etiquetaLocal).toBe("1° Zona A");
    expect(de("C1").visitanteId).toBe("B2");
    expect(de("S1").localId).toBeNull();
    expect(de("S1").etiquetaVisitante).toBe("Ganador Cuartos 2");
    expect(de("F").etiquetaLocal).toBe("Ganador Semi 1");
    expect(de("T").etiquetaLocal).toBe("Perdedor Semi 1");
  });

  it("los equipos cargados a mano en la planilla tienen prioridad", () => {
    const r = resolverLlaves(llaves, enPuesto, resultados(), (id) => (id === "C1" ? { localId: "X", visitanteId: null } : { localId: null, visitanteId: null }));
    expect(r.find((l) => l.config.id === "C1")).toMatchObject({ localId: "X", visitanteId: "B2" });
    expect(r.find((l) => l.config.id === "S1")!.localId).toBe("X");
  });

  it("detecta llaves configuradas en círculo", () => {
    const circulares: LlaveConfig[] = [
      { id: "X", fase: "semis", orden: 1, local: { tipo: "ganador", llave: "Y" }, visitante: { tipo: "posicion", zona: "A", puesto: 1 } },
      { id: "Y", fase: "semis", orden: 2, local: { tipo: "ganador", llave: "X" }, visitante: { tipo: "posicion", zona: "B", puesto: 1 } },
    ];
    expect(() => resolverLlaves(circulares, enPuesto, resultados())).toThrow(ErrorFormato);
  });
});
