import { describe, expect, it } from "vitest";
import type { TorneoConfig } from "@/domain/config";
import type { DatosTorneo, Evento, Partido } from "@/domain/tipos";
import { analizarTorneo } from "./analizar";
import { tablaGoleadores, tablaTarjetas } from "./estadisticas";

const config: TorneoConfig = {
  edicion: 2026,
  puntos: { victoria: 3, empate: 1, derrota: 0 },
  desempate: ["diferencia_gol", "goles_a_favor", "fair_play"],
  fairPlay: { amarilla: 1, roja: 3 },
  formato: { clasificadosPorZona: 2, cruces: "zonas", tercerPuesto: false, llaves: "auto" },
  duracionMinutos: 50,
  jugadores: { mostrarFichas: true, mostrarPesoAltura: true },
  revalidarSegundos: 30,
};

const equipo = (id: string, zona: string) => ({ id, anio: Number(id), zona, nombre: `Clase ${id}`, sigla: id.slice(-2), escudoUrl: null });
const jugador = (id: string, equipoId: string, nombre: string) => ({
  id, equipoId, nombre, apodo: null, numero: null, posicion: null, fotoUrl: null, pesoKg: null, alturaCm: null, soloEnEventos: false,
});

function partido(id: string, datos: Partial<Partido>): Partido {
  return {
    id, fase: "zona", zona: null, llave: null, fechaNro: null, fecha: "2026-12-05", hora: "10:00", cancha: null,
    localId: null, visitanteId: null, golesLocal: null, golesVisitante: null, arbitro: null, arbitroEquipoId: null,
    estado: "finalizado", penalesLocal: null, penalesVisitante: null, fila: 2,
    ...datos,
  };
}

let numeroEvento = 0;
const gol = (partidoId: string, equipoId: string, jugadorId: string | null = null, minuto = 10): Evento => ({
  id: `E${++numeroEvento}`, partidoId, tipo: "gol", equipoId, jugadorId, minuto,
});
const goles = (partidoId: string, equipoId: string, cantidad: number) => Array.from({ length: cantidad }, () => gol(partidoId, equipoId));

/** Dos zonas de dos equipos: semis 1A-2B y 1B-2A, y final. */
function torneoChico(extra: { partidos?: Partido[]; eventos?: Evento[] } = {}): DatosTorneo {
  return {
    equipos: [equipo("2001", "A"), equipo("2002", "A"), equipo("2003", "B"), equipo("2004", "B")],
    jugadores: [jugador("2001-01", "2001", "Ana"), jugador("2003-01", "2003", "Beto")],
    partidos: [
      partido("Z1", { zona: "A", localId: "2001", visitanteId: "2002", fecha: "2026-11-28" }),
      partido("Z2", { zona: "B", localId: "2003", visitanteId: "2004", fecha: "2026-11-28" }),
      partido("S1", { fase: "semis", llave: "S1", fecha: "2026-12-05" }),
      partido("S2", { fase: "semis", llave: "S2", fecha: "2026-12-05" }),
      partido("F", { fase: "final", llave: "F", fecha: "2026-12-12", estado: "programado" }),
      ...(extra.partidos ?? []),
    ],
    eventos: [
      ...goles("Z1", "2001", 2),
      gol("Z2", "2003", "2003-01"),
      // S1: 2001 (1A) vs 2004 (2B) → 1-1, gana 2004 por penales
      gol("S1", "2001", "2001-01"),
      gol("S1", "2004"),
      // S2: 2003 (1B) vs 2002 (2A) → 3-0
      ...goles("S2", "2003", 3),
      ...(extra.eventos ?? []),
    ],
    avisos: [],
    origen: "ejemplo",
    actualizadoEn: "2026-12-05T12:00:00.000Z",
  };
}

describe("analizarTorneo", () => {
  it("resuelve los cruces con las tablas y los penales", () => {
    const datos = torneoChico();
    datos.partidos[2] = { ...datos.partidos[2], penalesLocal: 3, penalesVisitante: 4 };
    const t = analizarTorneo(datos, config);
    const de = (id: string) => t.partidos.find((p) => p.id === id)!;

    expect(de("S1")).toMatchObject({ localId: "2001", visitanteId: "2004", marcador: { local: 1, visitante: 1 }, ganadorId: "2004" });
    expect(de("S2")).toMatchObject({ localId: "2003", visitanteId: "2002", ganadorId: "2003" });
    expect(de("F")).toMatchObject({ localId: "2004", visitanteId: "2003", marcador: null, ganadorId: null });
    expect(t.llaves.map((l) => l.nombre)).toEqual(["Semi 1", "Semi 2", "Final"]);
  });

  it("no define cruces mientras la zona no terminó", () => {
    const datos = torneoChico();
    datos.partidos[0] = { ...datos.partidos[0], estado: "en_juego" };
    const t = analizarTorneo(datos, config);
    const s1 = t.partidos.find((p) => p.id === "S1")!;
    expect(t.zonas.find((z) => z.zona === "A")!.completa).toBe(false);
    expect(s1.localId).toBeNull();
    expect(s1.etiquetaLocal).toBe("1° Zona A");
    expect(s1.visitanteId).toBe("2004");
  });

  it("un partido en juego muestra marcador pero no suma en la tabla", () => {
    const datos = torneoChico();
    datos.partidos[0] = { ...datos.partidos[0], estado: "en_juego" };
    const t = analizarTorneo(datos, config);
    expect(t.partidos.find((p) => p.id === "Z1")!.marcador).toEqual({ local: 2, visitante: 0 });
    expect(t.zonas.find((z) => z.zona === "A")!.tabla[0].pj).toBe(0);
  });

  it("calcula la racha con los últimos resultados, en orden", () => {
    const datos = torneoChico();
    datos.partidos[2] = { ...datos.partidos[2], penalesLocal: 3, penalesVisitante: 4 };
    const t = analizarTorneo(datos, config);
    expect(t.rachas["2001"]).toEqual(["G", "P"]); // ganó en zona, perdió la semi por penales
    expect(t.rachas["2004"]).toEqual(["P", "G"]);
  });

  it("la racha muestra como máximo los últimos tres", () => {
    const extra = [1, 2, 3].map((i) =>
      partido(`A${i}`, { zona: "A", localId: "2001", visitanteId: "2002", fecha: `2026-11-0${i}` }),
    );
    const t = analizarTorneo(torneoChico({ partidos: extra, eventos: goles("A3", "2002", 1) }), config);
    // A1 y A2 empatados 0-0 (antes), A3 perdido, Z1 ganado, S1 empate sin penales → E
    expect(t.rachas["2001"]).toEqual(["P", "G", "E"]);
  });

  it("informa formatos imposibles sin romper la app", () => {
    const t = analizarTorneo(torneoChico(), { ...config, formato: { ...config.formato, clasificadosPorZona: 3 } });
    expect(t.erroresFormato[0]).toContain("6 equipos");
    expect(t.llaves).toEqual([]);
  });
});

describe("estadísticas", () => {
  const jugadores = [jugador("1", "X", "Zoe"), jugador("2", "X", "Ana"), jugador("3", "Y", "Beto")];
  const ev = (tipo: Evento["tipo"], jugadorId: string): Evento => ({ id: "e", partidoId: "P", tipo, equipoId: "X", jugadorId, minuto: 1 });

  it("goleadores con posiciones compartidas, sin contar goles en contra", () => {
    const tabla = tablaGoleadores([ev("gol", "1"), ev("gol", "1"), ev("gol", "2"), ev("gol", "3"), ev("gol_en_contra", "3"), ev("amarilla", "2")], jugadores);
    expect(tabla.map((f) => [f.posicion, f.jugadorId, f.goles])).toEqual([
      [1, "1", 2],
      [2, "2", 1],
      [2, "3", 1],
    ]);
  });

  it("tarjetas: rojas primero, después amarillas", () => {
    const tabla = tablaTarjetas([ev("amarilla", "1"), ev("amarilla", "1"), ev("amarilla", "1"), ev("roja", "2"), ev("amarilla", "3"), ev("gol", "3")], jugadores);
    expect(tabla.map((f) => [f.posicion, f.jugadorId, f.rojas, f.amarillas])).toEqual([
      [1, "2", 1, 0],
      [2, "1", 0, 3],
      [3, "3", 0, 1],
    ]);
  });
});
