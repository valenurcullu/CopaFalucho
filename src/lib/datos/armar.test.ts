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
      { Equipos: leer("Equipos"), Partidos: leer("Partidos"), Eventos: leer("Eventos"), Jugadores: leer("Jugadores"), Formulario: leer("Formulario") },
      opciones,
    );
    expect(datos.avisos).toEqual([]);
    expect(datos.equipos).toHaveLength(20);
    // Las respuestas del formulario de ejemplo crean un jugador nuevo y completan otro.
    expect(datos.jugadores.find((j) => j.id === "2001-TOMASITURRALDE")).toMatchObject({ apodo: "Toto", equipoId: "2001" });
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
  it("ignora las columnas vacías que exporta Google", () => {
    const { columnas, filas } = leerCsv('"id","año","","",""\n"2001","2001","","",""\n');
    expect(columnas).toEqual(["id", "anio"]);
    expect(filas).toEqual([{ id: "2001", anio: "2001" }]);
  });

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
      estado: "programado",
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

describe("formulario de jugadores", () => {
  const equipos: FilaCruda[] = [
    { id: "2001", anio: "2001", zona: "A" },
    { id: "8YPICO", anio: "", zona: "A", nombre: "80 y pico", alias: "8ypico" },
  ];
  const AUTORIZA = "Acepto que mi foto y mis datos se publiquen";
  const respuesta = (datos: Record<string, string>): FilaCruda => ({
    "marca temporal": "10/11/2026 21:00:00",
    nombre: "", apellido: "", "apodo_(opcional)": "", categoria: "", posicion: "",
    "peso_(kg)": "", "altura_(cm)": "", foto_url: "", "autorizacion": AUTORIZA, ocultar: "",
    ...datos,
  });

  it("crea el perfil y lo suma al equipo elegido, con la foto de Drive", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equipos,
        Formulario: [
          respuesta({
            nombre: "juan cruz", apellido: "pérez", "apodo_(opcional)": "Coke", categoria: "Clase 2001", posicion: "Delantero",
            "peso_(kg)": "82,5", "altura_(cm)": "181", foto_url: "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp",
          }),
        ],
      }),
      opciones,
    );
    expect(datos.avisos).toEqual([]);
    expect(datos.jugadores[0]).toMatchObject({
      id: "2001-JUANCRUZPEREZ", equipoId: "2001", nombre: "Juan Cruz Pérez", apodo: "Coke", posicion: "Delantero",
      pesoKg: 82.5, alturaCm: 181, fotoDriveId: "1AbCdEfGhIjKlMnOp",
    });
    expect(datos.jugadores[0].fotoUrl).toBe("https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOp=w1200");
  });

  it("si respondió dos veces vale la última, y completa a un jugador que ya estaba", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equipos,
        Jugadores: [{ id: "8YPICO-01", equipo: "8ypico", nombre: "Lautaro Basavilbaso", numero: "1" }],
        Formulario: [
          respuesta({ nombre: "Lautaro", apellido: "Basavilbaso", categoria: "80 y pico", "peso_(kg)": "99" }),
          respuesta({ nombre: "Lautaro", apellido: "Basavilbaso", categoria: "80 y pico", "peso_(kg)": "96" }),
        ],
      }),
      opciones,
    );
    expect(datos.jugadores).toHaveLength(1);
    expect(datos.jugadores[0]).toMatchObject({ id: "8YPICO-01", numero: 1, pesoKg: 96 });
  });

  it("reconoce la pregunta de la foto aunque no se llame exactamente Foto", () => {
    const fila: FilaCruda = {
      ...respuesta({ nombre: "Valentin", apellido: "Urcullu", categoria: "Clase 2001" }),
      "agregar_foto_de_perfil_(con_camiseta_puesta)": "https://drive.google.com/open?id=1y6yYAZgWnfaNjuJiYZ4zWc",
    };
    delete fila.foto_url;
    const datos = armarDatos(hojas({ Equipos: equipos, Formulario: [fila] }), opciones);
    expect(datos.jugadores[0].fotoDriveId).toBe("1y6yYAZgWnfaNjuJiYZ4zWc");
  });

  it("no publica a quien no autorizó ni a los ocultados, y avisa categorías inexistentes", () => {
    const datos = armarDatos(
      hojas({
        Equipos: equipos,
        Formulario: [
          respuesta({ nombre: "A", apellido: "Uno", categoria: "Clase 2001", autorizacion: "" }),
          respuesta({ nombre: "B", apellido: "Dos", categoria: "Clase 2001", ocultar: "x" }),
          respuesta({ nombre: "C", apellido: "Tres", categoria: "Clase 1950" }),
        ],
      }),
      opciones,
    );
    expect(datos.jugadores).toEqual([]);
    expect(datos.avisos.map((a) => [a.hoja, a.fila, a.nivel])).toEqual([
      ["Formulario", 2, "advertencia"],
      ["Formulario", 4, "error"],
    ]);
  });
});

describe("pestaña Sanciones", () => {
  const base = {
    Equipos: [...equiposBase],
    Jugadores: [
      { id: "2001-07", equipo: "2001", nombre: "Bautista Acevedo", apodo: "Lolo" },
      { id: "2002-09", equipo: "2002", nombre: "Felipe Duran", apodo: "" },
    ],
  };
  const sanciones = (filas: FilaCruda[]) => armarDatos(hojas({ ...base, Sanciones: filas }), opciones);

  it("reconoce al jugador por nombre, apellido, apodo o id", () => {
    const datos = sanciones([
      { equipo: "2001", jugador: "Acevedo", fechas_sancion: "1", motivo: "", desde_partido: "" },
      { equipo: "2002", jugador: "Felipe Duran", fechas_sancion: "2", motivo: "Roja anterior", desde_partido: "" },
      { equipo: "01", jugador: "Lolo", fechas_sancion: "1", motivo: "", desde_partido: "" },
      { equipo: "2001", jugador: "2001-07", fechas_sancion: "1", motivo: "", desde_partido: "" },
    ]);
    expect(datos.avisos).toEqual([]);
    expect(datos.sancionesManuales).toEqual([
      { equipoId: "2001", jugadorId: "2001-07", fechas: 1, motivo: null, desdePartidoId: null },
      { equipoId: "2002", jugadorId: "2002-09", fechas: 2, motivo: "Roja anterior", desdePartidoId: null },
      { equipoId: "2001", jugadorId: "2001-07", fechas: 1, motivo: null, desdePartidoId: null },
      { equipoId: "2001", jugadorId: "2001-07", fechas: 1, motivo: null, desdePartidoId: null },
    ]);
  });

  it("avisa y saltea lo que no se puede resolver", () => {
    const datos = sanciones([
      { equipo: "2001", jugador: "Nadie", fechas_sancion: "1", motivo: "", desde_partido: "" },
      { equipo: "2001", jugador: "Felipe Duran", fechas_sancion: "1", motivo: "", desde_partido: "" },
      { equipo: "2001", jugador: "Acevedo", fechas_sancion: "", motivo: "", desde_partido: "" },
      { equipo: "9999", jugador: "Acevedo", fechas_sancion: "1", motivo: "", desde_partido: "" },
    ]);
    expect(datos.sancionesManuales).toEqual([]);
    expect(datos.avisos.map((a) => [a.hoja, a.fila, a.nivel])).toEqual([
      ["Sanciones", 2, "error"],
      ["Sanciones", 3, "error"],
      ["Sanciones", 4, "error"],
      ["Sanciones", 5, "error"],
    ]);
  });

  it("sin la pestaña, no hay sanciones ni avisos", () => {
    const datos = armarDatos(hojas({ ...base }), opciones);
    expect(datos.sancionesManuales).toEqual([]);
    expect(datos.avisos).toEqual([]);
  });

  it("la suspensión aparece en el análisis del torneo", () => {
    const datos = sanciones([{ equipo: "2001", jugador: "Acevedo", fechas_sancion: "1", motivo: "", desde_partido: "" }]);
    const t = analizarTorneo(
      {
        ...datos,
        partidos: [
          { id: "Z01", fase: "zona", zona: "A", llave: null, fechaNro: 1, fecha: "2026-11-23", hora: "17:00", cancha: null, localId: "2001", visitanteId: "2002", golesLocal: null, golesVisitante: null, arbitro: null, arbitroEquipoId: null, estado: "programado", penalesLocal: null, penalesVisitante: null, fila: 2 },
        ],
      },
      torneoConfig,
    );
    expect(t.sanciones).toHaveLength(1);
    expect(t.sanciones[0]).toMatchObject({ jugadorId: "2001-07", motivo: "manual", cumpleEnPartidoId: "Z01", cumplida: false });
  });
});

describe("jugadores por parecido", () => {
  const partido = { id: "Z1", fase: "zona", local: "2001", visitante: "2002", estado: "finalizado" };
  const jugadores = [
    { id: "2001-01", equipo: "2001", nombre: "Esteban Robbiano", apodo: "Rafa" },
    { id: "2001-02", equipo: "2001", nombre: "Demian Fernandez Alburquerque", apodo: "Pola" },
    { id: "2001-03", equipo: "2001", nombre: "Marcos Ferrari", apodo: "" },
    { id: "2001-04", equipo: "2001", nombre: "Pedro Ferraro", apodo: "" },
    { id: "2001-05", equipo: "2001", nombre: "Juan Perez", apodo: "" },
  ];
  const evento = (jugador: string, equipo = "2001") => ({ partido_id: "Z1", tipo: "gol", equipo, jugador, minuto: "" });
  const armar = (...nombres: [string, string?][]) =>
    armarDatos(hojas({ Equipos: equiposBase, Jugadores: jugadores, Partidos: [partido], Eventos: nombres.map(([n, e]) => evento(n, e)) }), opciones);

  it("une un error de tipeo con el jugador del mismo equipo y lo avisa una sola vez", () => {
    const datos = armar(["Robiano"], ["robiano"], ["Demoan"]);
    expect(datos.eventos.map((e) => e.jugadorId)).toEqual(["2001-01", "2001-01", "2001-02"]);
    expect(datos.jugadores.some((j) => j.soloEnEventos)).toBe(false);
    expect(datos.avisos.map((a) => [a.hoja, a.nivel, a.fila])).toEqual([
      ["Eventos", "advertencia", 2],
      ["Eventos", "advertencia", 4],
    ]);
    expect(datos.avisos[0].mensaje).toContain("Esteban Robbiano");
  });

  it("une un nombre a medias cuando todas las palabras están en el jugador", () => {
    expect(armar(["Demian Fernandez"]).eventos[0].jugadorId).toBe("2001-02");
    expect(armar(["Pola"]).avisos).toEqual([]);
  });

  it("no adivina si hay más de un candidato o si la palabra no se parece", () => {
    const datos = armar(["Ferrare"], ["Robbi"], ["Juan"], ["Lopez"]);
    expect(datos.eventos.every((e) => e.jugadorId?.startsWith("2001-") && e.jugadorId.length > 7)).toBe(true);
    expect(datos.jugadores.filter((j) => j.soloEnEventos).map((j) => j.nombre).sort()).toEqual(["Ferrare", "Juan", "Lopez", "Robbi"]);
    expect(datos.avisos).toEqual([]);
  });

  it("no mezcla equipos: el mismo apellido en otro equipo queda como jugador suelto", () => {
    const datos = armar(["Robiano", "2002"]);
    expect(datos.jugadores.find((j) => j.soloEnEventos)).toMatchObject({ equipoId: "2002", nombre: "Robiano" });
    expect(datos.avisos).toEqual([]);
  });

  it("los apellidos cortos solo coinciden si son idénticos", () => {
    const datos = armarDatos(
      hojas({ Equipos: equiposBase, Jugadores: [{ id: "2001-01", equipo: "2001", nombre: "Juan Rey", apodo: "" }], Partidos: [partido], Eventos: [evento("Ray")] }),
      opciones,
    );
    expect(datos.jugadores.find((j) => j.soloEnEventos)?.nombre).toBe("Ray");
  });
});

