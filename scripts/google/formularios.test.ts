import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { armarDatos } from "@/lib/datos/armar";
import { leerCsv } from "@/lib/datos/csv";
import { normalizarCodigo } from "@/lib/datos/campos";

/**
 * El script de Apps Script no se puede ejecutar acá, pero sus funciones de lectura
 * son puras: se cargan en un contexto aislado y se comparan con lo que hace la app,
 * porque el formulario de carga tiene que escribir exactamente los ids que la app espera.
 */
const sandbox: Record<string, (...args: never[]) => unknown> = {};
vm.runInNewContext(readFileSync(path.join(__dirname, "formularios.gs"), "utf8"), sandbox);
const gs = sandbox as unknown as {
  codigo_: (s: string) => string;
  leerEquipos_: (v: string[][]) => { resolver: (t: string) => string | null; nombreDe: Record<string, string> };
  leerJugadores_: (j: string[][], f: string[][], e: ReturnType<typeof gs.leerEquipos_>) => { id: string; equipoId: string; nombre: string; etiqueta: string }[];
  leerPartidos_: (v: string[][], e: ReturnType<typeof gs.leerEquipos_>) => { id: string; fila: number; localId: string | null; etiqueta: string }[];
  idDePartido_: (s: string) => string;
  separarEquipoYNombre_: (s: string) => { equipo: string; nombre: string } | null;
  cuando_: (f: string, h: string) => string;
};

const EQUIPOS = `id,año,zona,nombre,sigla,alias
2001,2001,B,,,
1995,1995,A,,,
1990,1990,A,,,
8YPICO,,C,Ochenta y pico,80+,"80 y pico, 8 y pico, 8ypico"
CONDOR,,C,Cóndor XV,CXV,"Médicos, Medicos, Medico"
`;

const FICHA = `Marca temporal,Nombre,Apellido,Apodo (opcional),Categoría,Posición,Peso (kg),Altura (cm),Autorización,Agregar foto de perfil (con camiseta puesta),Ocultar
6/11/2026 16:13:46,Valentin,Urcullu,Urcu,Clase 2001,Mediocampista,82,184,Acepto,,
6/11/2026 18:59:10,Valentín,Urcullú,Urcu,Clase 2001,Mediocampista,82,184,Acepto,,
6/11/2026 19:27:31,Tadeo,"Dinatale ",Fisio,Clase 2001,Delantero,78,180,Acepto,,
7/11/2026 5:55:47,"Fernando ","Berlingeri ",FerBer,Ochenta y pico,Mediocampista,85,182,Acepto,,
7/11/2026 6:00:00,Nicolas,Bellomo,,Médicos,Defensor,80,180,Acepto,,
7/11/2026 6:10:00,Juan,Oculto,,Clase 1995,Defensor,80,180,Acepto,,X
7/11/2026 6:20:00,Pedro,SinPermiso,,Clase 1995,Defensor,80,180,,,
7/11/2026 6:30:00,Luis,Repetido,,Clase 1990,Defensor,80,180,Acepto,,
7/11/2026 6:40:00,Luis,Repetido,,Clase 1990,Defensor,80,180,Acepto,,X
`;

const aFilas = (csv: string) => Papa.parse<string[]>(csv.trim(), { skipEmptyLines: true }).data;

describe("formularios.gs", () => {
  it("codigo_ normaliza igual que la app", () => {
    for (const texto of ["Clase 1990", "8 y pico", "Médicos", "Cóndor XV", "Iñaki Delguy", "  ab c-d_e ", "RDM"]) {
      expect(gs.codigo_(texto)).toBe(normalizarCodigo(texto));
    }
  });

  it("reconoce los equipos por id, nombre, año, dos cifras y alias", () => {
    const equipos = gs.leerEquipos_(aFilas(EQUIPOS));
    expect(equipos.resolver("Clase 2001")).toBe("2001");
    expect(equipos.resolver("01")).toBe("2001");
    expect(equipos.resolver("8ypico")).toBe("8YPICO");
    expect(equipos.resolver("Ochenta y pico")).toBe("8YPICO");
    expect(equipos.resolver("Médicos")).toBe("CONDOR");
    expect(equipos.resolver("Condor XV")).toBe("CONDOR");
    expect(equipos.resolver("Clase 1900")).toBeNull();
    expect(equipos.nombreDe["CONDOR"]).toBe("Cóndor XV");
  });

  it("arma los mismos jugadores, con los mismos ids, que la app", () => {
    const equipos = gs.leerEquipos_(aFilas(EQUIPOS));
    const delScript = gs.leerJugadores_([], aFilas(FICHA), equipos);

    const datos = armarDatos(
      { Equipos: leerCsv(EQUIPOS).filas, Partidos: [], Eventos: [], Jugadores: [], Formulario: leerCsv(FICHA).filas },
      { origen: "planilla", duracionMinutos: 40 },
    );
    const delApp = datos.jugadores.filter((j) => !j.soloEnEventos);

    expect(delScript.map((j) => j.id).sort()).toEqual(delApp.map((j) => j.id).sort());
    expect(delScript.map((j) => j.id)).toContain("2001-VALENTINURCULLU");
    // Ocultos, sin autorización y el repetido cuya última respuesta es "ocultar" no aparecen.
    expect(delScript.map((j) => j.nombre)).not.toContain("Juan Oculto");
    expect(delScript.map((j) => j.nombre)).not.toContain("Pedro Sinpermiso");
    expect(delScript.map((j) => j.nombre)).not.toContain("Luis Repetido");
    // "Médicos" cae en Cóndor XV.
    expect(delScript.find((j) => j.nombre === "Nicolas Bellomo")?.equipoId).toBe("CONDOR");
    expect(delScript.find((j) => j.nombre === "Nicolas Bellomo")?.etiqueta).toBe("Cóndor XV · Nicolas Bellomo");
  });

  it("los jugadores de la hoja Jugadores conservan su id", () => {
    const equipos = gs.leerEquipos_(aFilas(EQUIPOS));
    const jugadores = aFilas("id,equipo,nombre,apodo\n2001-07,2001,Ignacio Castro,Nacho\n");
    const ficha = aFilas(FICHA);
    const lista = gs.leerJugadores_(jugadores, ficha, equipos);
    expect(lista.find((j) => j.nombre === "Ignacio Castro")?.id).toBe("2001-07");
  });

  it("lista los partidos con su texto y reconoce el id", () => {
    const equipos = gs.leerEquipos_(aFilas(EQUIPOS));
    const partidos = gs.leerPartidos_(
      aFilas(
        [
          "id,fase,zona,llave,fecha_nro,fecha,hora,cancha,local,visitante,goles_local,goles_visitante,árbitro,estado",
          "Z01,zona,A,,1,23/11/2026,17:00:00,,1995,1990,,,2001,programado",
          "Z02,zona,C,,1,24/11/2026,18:40,,CONDOR,8YPICO,2,1,,finalizado",
          "C1,cuartos,,C1,,03/12/2026,20:00,,,,,,,programado",
        ].join("\n"),
      ),
      equipos,
    );
    expect(partidos[0].etiqueta).toBe("Z01 · Zona A · Fecha 1 · Clase 1995 vs Clase 1990 · 23/11 17:00");
    expect(partidos[1].etiqueta).toBe("Z02 · Zona C · Fecha 1 · Cóndor XV vs Ochenta y pico · 24/11 18:40  ✔");
    expect(partidos[2].etiqueta).toBe("C1 · Cuartos C1 · equipos a definir · 03/12 20:00");
    expect(partidos[0].fila).toBe(2);
    for (const p of partidos) expect(gs.idDePartido_(p.etiqueta)).toBe(p.id);
  });

  it('entiende "equipo - nombre" para jugadores que no están en la lista', () => {
    expect(gs.separarEquipoYNombre_("1995 - Juan Perez")).toEqual({ equipo: "1995", nombre: "Juan Perez" });
    expect(gs.separarEquipoYNombre_("Ochenta y pico: Ana Gomez-Lopez")).toEqual({ equipo: "Ochenta y pico", nombre: "Ana Gomez-Lopez" });
    expect(gs.separarEquipoYNombre_("Juan Perez")).toBeNull();
  });
});
