import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Hoja } from "@/domain/tipos";
import { armarDatos, type HojasCrudas } from "./armar";
import { parsearFecha, parsearHora } from "./campos";
import { leerCsv, type FilaCruda } from "./csv";
import { torneoConfig } from "@/config/torneo";
import { analizarTorneo } from "@/lib/torneo/analizar";

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
    expect(datos.equipos.find((e) => e.id === "2001")!.nombre).toBe("Clase 2001");
    expect(datos.equipos.find((e) => e.id === "8YPICO")).toMatchObject({ anio: null, nombre: "80 y pico", sigla: "80+" });
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
        Eventos: [{ partido_id: "Z1", tipo: "gol", equipo: "2001", jugador: "2002-01", minuto: "10" }],
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

describe("planilla cargada a mano", () => {
  const equipos: FilaCruda[] = [
    { id: "1990", anio: "1990", zona: "A" },
    { id: "8 y pico", anio: "", zona: "A", nombre: "80 y pico", sigla: "80+", alias: "8ypico, 80" },
    { id: "1985/86", anio: "1985", zona: "A", nombre: "1985/86" },
  ];

  it("reconoce los equipos como se escriban y arma ids aptos para links", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equipos,
        Partidos: [
          { id: "Z1", local: "90", visitante: "8ypico", estado: "finalizado", goles_local: "2", goles_visitante: "1", arbitro: "1985" },
          { id: "Z2", local: "80", visitante: "1985/86", estado: "finalizado", arbitro: "Coppola" },
        ],
      }),
      opciones,
    );
    expect(datos.avisos).toEqual([]);
    expect(datos.equipos.map((e) => e.id)).toEqual(["1990", "8YPICO", "1985-86"]);
    expect(datos.partidos[0]).toMatchObject({ localId: "1990", visitanteId: "8YPICO", golesLocal: 2, golesVisitante: 1, arbitroEquipoId: "1985-86" });
    expect(datos.partidos[1]).toMatchObject({ localId: "8YPICO", visitanteId: "1985-86", arbitroEquipoId: null, arbitro: "Coppola" });
  });

  it("encuentra al jugador por apodo o apellido y crea los que no están en Jugadores", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equipos,
        Jugadores: [
          { id: "1990-01", equipo: "90", nombre: "Jorge Coke Pérez", apodo: "Coke" },
          { id: "1990-02", equipo: "1990", nombre: "Martín Monclús" },
        ],
        Partidos: [{ id: "Z1", local: "1990", visitante: "8YPICO", estado: "finalizado" }],
        Eventos: [
          { partido_id: "Z1", tipo: "gol", equipo: "90", jugador: "coke" },
          { partido_id: "Z1", tipo: "gol", equipo: "1990", jugador: "monclus" },
          { partido_id: "Z1", tipo: "gol", equipo: "8ypico", jugador: "4palos cuevas" },
          { partido_id: "Z1", tipo: "amarilla", equipo: "8 y pico", jugador: "4Palos  Cuevas" },
        ],
      }),
      opciones,
    );
    expect(datos.avisos).toEqual([]);
    expect(datos.eventos.map((e) => e.jugadorId)).toEqual(["1990-01", "1990-02", "8YPICO-4PALOSCUEVAS", "8YPICO-4PALOSCUEVAS"]);
    expect(datos.jugadores.find((j) => j.id === "8YPICO-4PALOSCUEVAS")).toMatchObject({ nombre: "4palos Cuevas", soloEnEventos: true });
  });

  it("el resultado cargado a mano manda sobre los goles de Eventos", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equipos,
        Partidos: [
          { id: "Z1", local: "1990", visitante: "8YPICO", estado: "finalizado", goles_local: "9", goles_visitante: "0" },
          { id: "Z2", local: "1990", visitante: "1985/86", estado: "finalizado", goles_local: "1", goles_visitante: "0" },
        ],
        Eventos: [
          { partido_id: "Z1", tipo: "gol", equipo: "1990", jugador: "masacote" },
          { partido_id: "Z2", tipo: "gol", equipo: "1990" },
          { partido_id: "Z2", tipo: "gol", equipo: "1990" },
        ],
      }),
      opciones,
    );
    const t = analizarTorneo(datos, torneoConfig);
    expect(t.partidos.find((p) => p.id === "Z1")!.marcador).toEqual({ local: 9, visitante: 0 });
    // En Z2 hay más goles en Eventos que en el resultado: se avisa.
    expect(t.avisos.map((a) => a.mensaje)).toEqual([expect.stringContaining("Z2 terminó 1-0 pero en Eventos hay 2-0")]);
  });

  it("avisa si el resultado está cargado a medias", () => {
    const datos = armarDatos(
      hojas({ Equipos: equipos, Partidos: [{ id: "Z1", local: "1990", visitante: "8YPICO", estado: "finalizado", goles_local: "2" }] }),
      opciones,
    );
    expect(datos.partidos[0].golesLocal).toBeNull();
    expect(datos.avisos[0].mensaje).toContain("un solo equipo");
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
