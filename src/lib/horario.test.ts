import { describe, expect, it } from "vitest";
import { inicioPartido, partidosEnCancha, proximoTurno, seEstaJugando } from "./horario";

const duracion = { duracionMinutos: 40, descansoMinutos: 5 };
const partido = (hora: string, fecha = "2026-11-28", estado: "programado" | "finalizado" = "programado") => ({ fecha, hora, estado, id: `${fecha} ${hora}` });
const ar = (fechaHora: string) => new Date(`${fechaHora}:00-03:00`);

describe("horario", () => {
  it("interpreta la fecha y la hora en horario de Buenos Aires", () => {
    expect(inicioPartido(partido("19:30"))!.toISOString()).toBe("2026-11-28T22:30:00.000Z");
    expect(inicioPartido({ fecha: null, hora: "19:30" })).toBeNull();
  });

  it("un partido se está jugando desde que empieza hasta los 45 minutos (40 + descanso)", () => {
    const p = partido("19:30");
    expect(seEstaJugando(p, ar("2026-11-28T19:29"), duracion)).toBe(false);
    expect(seEstaJugando(p, ar("2026-11-28T19:30"), duracion)).toBe(true);
    expect(seEstaJugando(p, ar("2026-11-28T20:14"), duracion)).toBe(true);
    expect(seEstaJugando(p, ar("2026-11-28T20:15"), duracion)).toBe(false);
  });

  it("a las 19:35 muestra los dos partidos de las 19:30", () => {
    const partidos = [partido("18:30"), partido("19:30"), partido("19:30"), partido("20:30")];
    expect(partidosEnCancha(partidos, ar("2026-11-28T19:35"), duracion)).toHaveLength(2);
  });

  it("el próximo turno son los partidos de la hora más cercana sin jugar", () => {
    const partidos = [partido("18:30", "2026-11-28", "finalizado"), partido("20:30"), partido("20:30"), partido("10:00", "2026-11-29")];
    expect(proximoTurno(partidos, ar("2026-11-28T19:35")).map((p) => p.hora)).toEqual(["20:30", "20:30"]);
    expect(proximoTurno(partidos, ar("2026-11-28T21:00")).map((p) => p.fecha)).toEqual(["2026-11-29"]);
    expect(proximoTurno(partidos, ar("2026-12-30T10:00"))).toEqual([]);
  });
});
