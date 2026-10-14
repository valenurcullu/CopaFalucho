import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Hoja } from "@/domain/tipos";
import { armarDatos, type HojasCrudas } from "./armar";
import { parsearFecha, parsearHora } from "./campos";
import { leerCsv } from "./csv";

const opciones = { origen: "ejemplo" as const, duracionMinutos: 50 };

function hojas(parciales: Partial<HojasCrudas>): HojasCrudas {
  return { Equipos: [], Partidos: [], Eventos: [], Jugadores: [], ...parciales };
}

const equiposBase = [
  { id: "2001", anio: "2001", zona: "A" },
  { id: "2002", anio: "2002", zona: "A" },
];

describe("datos de ejemplo", () => {
  it("se leen completos y sin avisos", () => {
    const leer = (hoja: Hoja) =>
      leerCsv(readFileSync(path.join(process.cwd(), "data/ejemplo", `${hoja.toLowerCase()}.csv`), "utf8")).filas;
    const datos = armarDatos(
      { Equipos: leer("Equipos"), Partidos: leer("Partidos"), Eventos: leer("Eventos"), Jugadores: leer("Jugadores") },
      opciones,
    );
    expect(datos.avisos).toEqual([]);
    expect(datos.equipos).toHaveLength(16);
    expect(datos.equipos[0].nombre).toMatch(/^Clase \d{4}$/);
  });
});

describe("formato gviz de Google Sheets", () => {
  it("lee valores entre comillas y celdas vacías", () => {
    const csv = '"id","año","zona","nombre","escudo_url"\n"2001","2001","A","",""\n"2002","2002","A","Los Pibes",""\n';
    const datos = armarDatos(hojas({ Equipos: leerCsv(csv).filas }), opciones);
    expect(datos.avisos).toEqual([]);
    expect(datos.equipos.map((e) => e.nombre)).toEqual(["Clase 2001", "Los Pibes"]);
  });

  it("una hoja vacía no tiene columnas ni filas", () => {
    expect(leerCsv("")).toEqual({ columnas: [], filas: [] });
  });
});

describe("encabezados", () => {
  it("acepta mayúsculas, acentos y alias", () => {
    const { columnas } = leerCsv("ID,Año,Zona,Nombre opcional\n2001,2001,A,\n");
    expect(columnas).toEqual(["id", "anio", "zona", "nombre"]);
  });
});

describe("armarDatos", () => {
  it("usa el año como id y 'Clase año' como nombre si faltan", () => {
    const datos = armarDatos(hojas({ Equipos: [{ id: "", anio: "2003", zona: "b" }] }), opciones);
    expect(datos.equipos[0]).toMatchObject({ id: "2003", nombre: "Clase 2003", zona: "B" });
  });

  it("normaliza estado y fase escritos a mano", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equiposBase,
        Partidos: [{ id: "z1", fase: "Zona", local: "2001", visitante: "2002", estado: "En Juego", fecha: "5/12/2026", hora: "9.30" }],
      }),
      opciones,
    );
    expect(datos.avisos).toEqual([]);
    expect(datos.partidos[0]).toMatchObject({
      id: "Z1",
      estado: "en_juego",
      zona: "A",
      fecha: "2026-12-05",
      hora: "09:30",
    });
  });

  it("saltea filas inválidas y avisa con el número de fila de la planilla", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equiposBase,
        Partidos: [
          { id: "Z1", fase: "zona", local: "2001", visitante: "2002", estado: "finalizado" },
          { id: "Z2", fase: "zona", local: "2001", visitante: "1999", estado: "finalizado" },
          { id: "Z3", fase: "zona", local: "2001", visitante: "2002", estado: "suspendidísimo" },
        ],
      }),
      opciones,
    );
    expect(datos.partidos.map((p) => p.id)).toEqual(["Z1"]);
    expect(datos.avisos).toHaveLength(2);
    expect(datos.avisos[0]).toMatchObject({ nivel: "error", hoja: "Partidos", fila: 3 });
    expect(datos.avisos[0].mensaje).toContain("1999");
    expect(datos.avisos[1].mensaje).toContain("suspendidísimo");
  });

  it("rechaza eventos de un equipo que no juega el partido", () => {
    const datos = armarDatos(
      hojas({
        Equipos: [...equiposBase, { id: "2003", anio: "2003", zona: "A" }],
        Partidos: [{ id: "Z1", fase: "zona", local: "2001", visitante: "2002", estado: "finalizado" }],
        Eventos: [
          { partido_id: "Z1", tipo: "gol", equipo: "2001", minuto: "10" },
          { partido_id: "Z1", tipo: "gol", equipo: "2003", minuto: "12" },
        ],
      }),
      opciones,
    );
    expect(datos.eventos).toHaveLength(1);
    expect(datos.avisos[0].mensaje).toContain("no juega");
  });

  it("cuenta el evento sin jugador si el jugador es de otro equipo", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equiposBase,
        Jugadores: [{ id: "2002-01", equipo: "2002", nombre: "Juan Pérez" }],
        Partidos: [{ id: "Z1", fase: "zona", local: "2001", visitante: "2002", estado: "finalizado" }],
        Eventos: [{ partido_id: "Z1", tipo: "gol", equipo: "2001", jugador_id: "2002-01", minuto: "10" }],
      }),
      opciones,
    );
    expect(datos.eventos[0].jugadorId).toBeNull();
    expect(datos.avisos[0].nivel).toBe("advertencia");
  });

  it("acepta partidos de fase final con llave y sin equipos", () => {
    const datos = armarDatos(
      hojas({ Partidos: [{ id: "CU1", fase: "cuartos", llave: "c1", estado: "" }] }),
      opciones,
    );
    expect(datos.partidos[0]).toMatchObject({ llave: "C1", localId: null, estado: "programado", zona: null });
  });

  it("acepta decimales con coma en peso y altura", () => {
    const datos = armarDatos(
      hojas({ Equipos: equiposBase, Jugadores: [{ id: "2001-01", equipo: "2001", nombre: "A", peso_kg: "82,5", altura_cm: "181" }] }),
      opciones,
    );
    expect(datos.jugadores[0]).toMatchObject({ pesoKg: 82.5, alturaCm: 181 });
  });
});

describe("fechas y horas", () => {
  it.each([
    ["15/12/2026", "2026-12-15"],
    ["5/1/26", "2026-01-05"],
    ["2026-12-15", "2026-12-15"],
    ["31/02/2026", null],
    ["mañana", null],
  ])("parsearFecha(%s)", (entrada, salida) => expect(parsearFecha(entrada)).toBe(salida));

  it.each([
    ["18:30", "18:30"],
    ["9:05:00", "09:05"],
    ["18hs", "18:00"],
    ["25:00", null],
  ])("parsearHora(%s)", (entrada, salida) => expect(parsearHora(entrada)).toBe(salida));
});
