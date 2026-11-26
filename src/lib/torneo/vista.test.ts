import { describe, expect, it } from "vitest";
import { agruparEventos, type EventoVista } from "./vista";

let n = 0;
const evento = (jugadorId: string | null, extra: Partial<EventoVista> = {}): EventoVista => ({
  id: `E${++n}`, tipo: "gol", lado: "local", minuto: null, jugadorId, jugador: jugadorId ? `Jugador ${jugadorId}` : null, ...extra,
});

describe("agruparEventos", () => {
  it("junta los goles del mismo jugador: doblete y triplete", () => {
    const r = agruparEventos([evento("A"), evento("B"), evento("A"), evento("A")]);
    expect(r.map((e) => [e.jugadorId, e.cantidad])).toEqual([["A", 3], ["B", 1]]);
  });

  it("respeta el orden de la primera aparición", () => {
    const r = agruparEventos([evento("B"), evento("A"), evento("B")]);
    expect(r.map((e) => e.jugadorId)).toEqual(["B", "A"]);
  });

  it("no mezcla tipos distintos del mismo jugador: gol y amarilla", () => {
    const r = agruparEventos([evento("A"), evento("A", { tipo: "amarilla" }), evento("A", { tipo: "amarilla" })]);
    expect(r.map((e) => [e.tipo, e.cantidad])).toEqual([["gol", 1], ["amarilla", 2]]);
  });

  it("no mezcla lados: un gol en contra suma al otro lado", () => {
    const r = agruparEventos([evento("A", { tipo: "gol_en_contra", lado: "local" }), evento("A", { tipo: "gol_en_contra", lado: "visitante" })]);
    expect(r).toHaveLength(2);
  });

  it("junta los eventos sin jugador conocido", () => {
    const r = agruparEventos([evento(null, { tipo: "gol_en_contra" }), evento(null, { tipo: "gol_en_contra" })]);
    expect(r).toHaveLength(1);
    expect(r[0].cantidad).toBe(2);
  });

  it("no modifica la lista original", () => {
    const original = [evento("A"), evento("A")];
    agruparEventos(original);
    expect(original.every((e) => !("cantidad" in e))).toBe(true);
  });
});
