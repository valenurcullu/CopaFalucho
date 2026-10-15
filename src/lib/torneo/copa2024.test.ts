import { describe, expect, it } from "vitest";
import { torneoConfig } from "@/config/torneo";
import type { CriterioDesempate } from "@/domain/config";
import { armarDatos } from "@/lib/datos/armar";
import { analizarTorneo } from "./analizar";

/**
 * Fase de grupos real de la Copa Falucho 2024, cargada como la escribiría el
 * admin: resultados a mano, equipos como "90" u "8ypico", árbitros que son
 * otras clases. La app tiene que llegar a los mismos cruces que se jugaron.
 */
const EQUIPOS = [
  ["2004", "2004", "A", ""], ["2003", "2003", "A", ""], ["2002", "2002", "A", ""], ["1985", "1985", "A", "1985/86"],
  ["8YPICO", "", "B", "80 y pico"], ["1999", "1999", "B", ""], ["1996", "1996", "B", ""], ["RDM", "", "B", ""],
  ["2000", "2000", "C", ""], ["1997", "1997", "C", ""], ["2005", "2005", "C", ""], ["2006", "2006", "C", ""],
  ["1990", "1990", "D", ""], ["1995", "1995", "D", ""], ["2001", "2001", "D", ""], ["1981", "1981", "D", ""],
].map(([id, anio, zona, nombre]) => ({ id, anio, zona, nombre, alias: id === "8YPICO" ? "8ypico, 8 y pico" : "" }));

// fecha, hora, árbitro, local, visitante, resultado
const PARTIDOS = [
  ["25/11", "20:00", "2000", "2004", "2003", "1-0"], ["25/11", "20:00", "2001", "1985", "2002", "0-3"],
  ["25/11", "21:00", "2002", "2001", "1981", "3-0"], ["25/11", "21:00", "2004", "1997", "2006", "4-0"],
  ["25/11", "22:00", "2003", "1996", "RDM", "4-0"], ["25/11", "22:00", "1997", "2000", "2005", "0-0"],
  ["27/11", "20:00", "1996", "2006", "2005", "1-1"], ["27/11", "20:00", "2003", "8YPICO", "RDM", "3-1"],
  ["27/11", "21:00", "2000", "1985", "2003", "0-1"], ["27/11", "21:00", "1997", "1995", "1990", "2-5"],
  ["27/11", "22:00", "1995", "99", "1996", "3-1"], ["27/11", "22:00", "RDM", "2000", "1997", "2-0"],
  ["2/12", "20:00", "2000", "2002", "2003", "0-5"], ["2/12", "20:00", "1999", "1981", "90", "0-1"],
  ["2/12", "21:00", "2001", "8ypico", "1999", "2-1"], ["2/12", "21:00", "1995", "2004", "1985", "9-0"],
  ["2/12", "22:00", "2002", "2001", "1995", "0-1"], ["2/12", "22:00", "2004", "2000", "2006", "1-1"],
  ["3/12", "20:00", "1996", "2004", "2002", "0-1"], ["3/12", "20:00", "2001", "RDM", "1999", "0-3"],
  ["3/12", "21:00", "2005", "8 y pico", "1996", "6-2"], ["3/12", "21:00", "2000", "2001", "1990", "1-1"],
  ["3/12", "22:00", "2002", "1997", "2005", "3-3"], ["3/12", "22:00", "2004", "1981", "1995", "1-1"],
].map(([fecha, hora, arbitro, local, visitante, resultado], i) => {
  const [goles_local, goles_visitante] = resultado.split("-");
  return { id: `Z${i + 1}`, fase: "zona", fecha: `${fecha}/2024`, hora, arbitro, local, visitante, goles_local, goles_visitante, estado: "finalizado" };
});

const CUARTOS = ["C1", "C2", "C3", "C4"].map((llave) => ({ id: `CF-${llave}`, fase: "cuartos", llave, fecha: "4/12/2024", estado: "programado" }));

function torneo2024(desempate: CriterioDesempate[]) {
  const datos = armarDatos(
    { Equipos: EQUIPOS, Partidos: [...PARTIDOS, ...CUARTOS], Eventos: [], Jugadores: [] },
    { origen: "planilla", duracionMinutos: 50 },
  );
  return { datos, torneo: analizarTorneo(datos, { ...torneoConfig, desempate, formato: { ...torneoConfig.formato, cruces: "general" } }) };
}

const orden = (filas: { equipoId: string }[]) => filas.map((f) => f.equipoId);

describe("Copa Falucho 2024", () => {
  const { datos, torneo } = torneo2024(["enfrentamiento_directo", "diferencia_gol", "goles_a_favor"]);

  it("lee la planilla sin errores aunque los equipos estén escritos de distintas formas", () => {
    expect(datos.avisos).toEqual([]);
    expect(datos.partidos.find((p) => p.id === "Z11")!.localId).toBe("1999"); // "99"
    expect(datos.partidos.find((p) => p.id === "Z14")!.visitanteId).toBe("1990"); // "90"
    expect(datos.partidos.find((p) => p.id === "Z21")!.localId).toBe("8YPICO"); // "8 y pico"
    expect(datos.partidos.find((p) => p.id === "Z1")!.arbitroEquipoId).toBe("2000");
    expect(datos.equipos.find((e) => e.id === "1985")!.nombre).toBe("1985/86");
  });

  it("calcula las tablas de cada zona", () => {
    const zona = (z: string) => torneo.zonas.find((x) => x.zona === z)!.tabla;
    expect(orden(zona("A"))).toEqual(["2004", "2003", "2002", "1985"]);
    expect(orden(zona("B"))).toEqual(["8YPICO", "1999", "1996", "RDM"]);
    expect(orden(zona("C"))).toEqual(["2000", "1997", "2005", "2006"]);
    expect(orden(zona("D"))).toEqual(["1990", "1995", "2001", "1981"]);
    // La planilla vieja tenía estos dos datos mal: RDM con 2 PJ y 8ypico con +8.
    expect(zona("B").find((f) => f.equipoId === "RDM")).toMatchObject({ pj: 3, dg: -9 });
    expect(zona("B")[0]).toMatchObject({ pts: 9, dg: 7 });
  });

  it("arma la tabla general de clasificados igual que en 2024", () => {
    expect(orden(torneo.general)).toEqual(["8YPICO", "1990", "2004", "2003", "1999", "2000", "1997", "1995"]);
  });

  it("arma los mismos cruces de cuartos que se jugaron", () => {
    const cruces = torneo.partidos
      .filter((p) => p.fase === "cuartos")
      .map((p) => [p.localId, p.visitanteId].sort().join(" vs "))
      .sort();
    expect(cruces).toEqual(["1990 vs 1997", "1995 vs 8YPICO", "1999 vs 2003", "2000 vs 2004"]);
  });

  it("con diferencia de gol antes que el enfrentamiento directo, en la zona D pasa 2001", () => {
    const { torneo: otro } = torneo2024(["diferencia_gol", "goles_a_favor", "fair_play"]);
    expect(orden(otro.zonas.find((z) => z.zona === "D")!.tabla).slice(0, 2)).toEqual(["1990", "2001"]);
  });
});
