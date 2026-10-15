/**
 * Genera los datos de ejemplo en data/ejemplo/*.csv, con el mismo formato que
 * la planilla real. Uso: npm run ejemplo:generar
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { torneoConfig } from "../../src/config/torneo";
import type { Fase } from "../../src/domain/tipos";
import { armarDatos } from "../../src/lib/datos/armar";
import { escribirCsv, normalizarColumna, type FilaCruda } from "../../src/lib/datos/csv";
import { COLUMNAS } from "../../src/lib/datos/esquemas";
import { analizarTorneo } from "../../src/lib/torneo/analizar";
import { crearAzar, type Azar } from "./azar";
import { APELLIDOS, ARBITROS, NOMBRES } from "./nombres";

const SEMILLA = 1943; // año de fundación del club
const CARPETA = path.join(process.cwd(), "data", "ejemplo");
const DURACION = 50;
const CANCHAS = ["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4"];
const ZONAS = ["A", "B", "C", "D"];
/** 15 clases y un equipo de varias generaciones, como pasa en la copa real. */
const EQUIPO_VETERANOS = { id: "8YPICO", nombre: "80 y pico", sigla: "80+", alias: "8 y pico, 80 y pico, 80" };
const CLASES: (number | typeof EQUIPO_VETERANOS)[] = [EQUIPO_VETERANOS, ...Array.from({ length: 15 }, (_, i) => 1994 + i)];
const idDe = (c: (typeof CLASES)[number]) => (typeof c === "number" ? String(c) : c.id);
const APODOS = ["Coke", "Mapache", "Rata", "Osito", "Pelado", "Laucha", "Tano", "Ruso", "Negro", "Chino", "Colo", "Flaco", "Gordo", "Toto", "Pipa", "Dumbo"];

type Fila = (string | number | null)[];

interface JugadorEjemplo {
  id: string;
  equipo: string;
  nombre: string;
  apodo: string | null;
  numero: number;
  posicion: Posicion;
  peso: number;
  altura: number;
}

type Posicion = "Arquero" | "Defensor" | "Mediocampista" | "Delantero";

const PLANTEL: Posicion[] = [
  "Arquero", "Arquero",
  "Defensor", "Defensor", "Defensor", "Defensor",
  "Mediocampista", "Mediocampista", "Mediocampista", "Mediocampista", "Mediocampista",
  "Delantero", "Delantero", "Delantero",
];

const PESO_GOL: Record<Posicion, number> = { Arquero: 0.05, Defensor: 1, Mediocampista: 3, Delantero: 6 };

function generarJugadores(azar: Azar, equipo: string): JugadorEjemplo[] {
  const numerosLibres = azar.mezclar(Array.from({ length: 30 }, (_, i) => i + 2).filter((n) => n !== 12));
  const usados = new Set<string>();
  return PLANTEL.map((posicion, i) => {
    let nombre: string;
    do nombre = `${azar.elegir(NOMBRES)} ${azar.elegir(APELLIDOS)}`;
    while (usados.has(nombre));
    usados.add(nombre);
    const numero = posicion === "Arquero" ? (i === 0 ? 1 : 12) : numerosLibres.pop()!;
    const altura = azar.entero(posicion === "Arquero" ? 180 : 166, posicion === "Arquero" ? 194 : 190);
    const peso = Math.round((altura - 100) * (0.85 + azar.siguiente() * 0.35));
    return {
      id: `${equipo}-${String(i + 1).padStart(2, "0")}`,
      equipo,
      apodo: azar.siguiente() < 0.3 ? azar.elegir(APODOS) : null,
      nombre,
      numero,
      posicion,
      peso,
      altura,
    };
  });
}

/** Goles y tarjetas de un partido jugado. Devuelve filas de la hoja Eventos. */
export function simularEventos(
  azar: Azar,
  partidoId: string,
  equipos: [string, string],
  plantel: Map<string, JugadorEjemplo[]>,
  opciones: { hastaMinuto?: number; golesForzados?: [number, number] } = {},
): Fila[] {
  const hasta = opciones.hastaMinuto ?? DURACION;
  const eventos: { minuto: number; fila: Fila }[] = [];
  equipos.forEach((equipo, lado) => {
    const jugadores = plantel.get(equipo)!;
    const goles = opciones.golesForzados?.[lado] ?? azar.poisson(1.5 * (hasta / DURACION));
    for (let g = 0; g < goles; g++) {
      const minuto = azar.entero(1, hasta);
      if (azar.siguiente() < 0.04) {
        // Gol en contra: lo hace un jugador del rival y suma para este equipo.
        const rival = equipos[1 - lado];
        const autor = azar.elegir(plantel.get(rival)!.filter((j) => j.posicion === "Defensor"));
        eventos.push({ minuto, fila: [partidoId, "gol en contra", rival, autor.id, minuto] });
      } else {
        const autor = azar.ponderado(jugadores, (j) => PESO_GOL[j.posicion]);
        eventos.push({ minuto, fila: [partidoId, "gol", equipo, autor.id, minuto] });
      }
    }
    const amarillas = azar.poisson(0.9 * (hasta / DURACION));
    for (let t = 0; t < amarillas; t++) {
      const minuto = azar.entero(5, hasta);
      eventos.push({ minuto, fila: [partidoId, "amarilla", equipo, azar.elegir(jugadores).id, minuto] });
    }
    if (azar.siguiente() < 0.08 * (hasta / DURACION)) {
      const minuto = azar.entero(10, hasta);
      eventos.push({ minuto, fila: [partidoId, "roja", equipo, azar.elegir(jugadores).id, minuto] });
    }
  });
  return eventos.sort((a, b) => a.minuto - b.minuto).map((e) => e.fila);
}

/** Goles de local y visitante según las filas de Eventos de un partido. */
function contarGoles(eventos: Fila[], localId: string): [number, number] {
  const goles = eventos.filter((e) => e[1] === "gol" || e[1] === "gol en contra");
  const local = goles.filter((e) => (e[1] === "gol") === (e[2] === localId)).length;
  return [local, goles.length - local];
}

/** Todos contra todos para 4 equipos: 3 fechas de 2 partidos. */
const ROUND_ROBIN_4: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[3, 0], [1, 2]],
];

const FECHAS_ZONA = ["28/11/2026", "29/11/2026", "05/12/2026"];

/** Índices de columnas de la hoja Partidos que se completan al simular. */
const COL = {
  estado: COLUMNAS.Partidos.indexOf("estado"),
  penalesLocal: COLUMNAS.Partidos.indexOf("penales_local"),
  penalesVisitante: COLUMNAS.Partidos.indexOf("penales_visitante"),
};

function aCrudas(columnas: readonly string[], filas: Fila[]): FilaCruda[] {
  const claves = columnas.map(normalizarColumna);
  return filas.map((f) => Object.fromEntries(claves.map((c, i) => [c, f[i] === null ? "" : String(f[i])])));
}

/**
 * Escenario de la fase final: cuartos jugados (uno por penales), una semi
 * terminada, la otra en juego y la final por jugarse. Los cruces salen de la
 * misma lógica que usa la app, así que el ejemplo siempre es consistente.
 */
function simularFaseFinal(
  azar: Azar,
  equipos: Fila[],
  partidos: Fila[],
  eventos: Fila[],
  jugadores: Fila[],
  plantel: Map<string, JugadorEjemplo[]>,
) {
  const guion: Partial<Record<string, { estado: "finalizado" | "en juego"; hastaMinuto?: number; golesForzados?: [number, number] }>> = {
    CU1: { estado: "finalizado" },
    CU2: { estado: "finalizado", golesForzados: [1, 1] },
    CU3: { estado: "finalizado" },
    CU4: { estado: "finalizado" },
    SE1: { estado: "finalizado" },
    SE2: { estado: "en juego", hastaMinuto: 32 },
  };
  const fases: Fase[] = ["octavos", "cuartos", "semis", "tercer_puesto", "final"];
  for (const fase of fases) {
    const datos = armarDatos(
      {
        Equipos: aCrudas(COLUMNAS.Equipos, equipos),
        Partidos: aCrudas(COLUMNAS.Partidos, partidos),
        Eventos: aCrudas(COLUMNAS.Eventos, eventos),
        Jugadores: aCrudas(COLUMNAS.Jugadores, jugadores),
      },
      { origen: "ejemplo", duracionMinutos: DURACION },
    );
    const torneo = analizarTorneo(datos, torneoConfig);
    for (const p of torneo.partidos.filter((x) => x.fase === fase)) {
      const paso = guion[p.id];
      if (!paso || !p.localId || !p.visitanteId) continue;
      const fila = partidos.find((f) => f[0] === p.id)!;
      const nuevos = simularEventos(azar, p.id, [p.localId, p.visitanteId], plantel, paso);
      eventos.push(...nuevos);
      fila[COL.estado] = paso.estado;
      if (paso.estado !== "finalizado") continue;
      const [gl, gv] = contarGoles(nuevos, p.localId);
      if (gl === gv) {
        const ganados = azar.entero(3, 5);
        const local = azar.siguiente() < 0.5;
        fila[COL.penalesLocal] = local ? ganados : ganados - azar.entero(1, 2);
        fila[COL.penalesVisitante] = local ? ganados - azar.entero(1, 2) : ganados;
      }
    }
  }
}

async function main() {
  const azar = crearAzar(SEMILLA);

  // Equipos y sorteo de zonas
  const sorteo = azar.mezclar(CLASES.map(idDe));
  const zonaDe = new Map<string, string>();
  sorteo.forEach((id, i) => zonaDe.set(id, ZONAS[Math.floor(i / 4)]));
  const equipos: Fila[] = CLASES.map((c) =>
    typeof c === "number"
      ? [String(c), c, zonaDe.get(String(c))!, null, null, null, null]
      : [c.id, null, zonaDe.get(c.id)!, c.nombre, c.sigla, c.alias, null],
  );

  // Jugadores
  const plantel = new Map<string, JugadorEjemplo[]>();
  for (const c of CLASES) plantel.set(idDe(c), generarJugadores(azar, idDe(c)));
  const jugadores: Fila[] = [...plantel.values()].flat().map((j) => [
    j.id, j.equipo, j.nombre, j.apodo, j.numero, j.posicion, null, j.peso, j.altura,
  ]);

  // Fase de zonas: dos turnos por fecha (zonas A-B y C-D), cuatro canchas.
  const partidos: Fila[] = [];
  const eventos: Fila[] = [];
  let numero = 0;
  ROUND_ROBIN_4.forEach((cruces, f) => {
    ZONAS.forEach((zona, z) => {
      const integrantes = sorteo.slice(z * 4, z * 4 + 4);
      cruces.forEach(([l, v], c) => {
        const id = `Z${String(++numero).padStart(2, "0")}`;
        const local = integrantes[l];
        const visitante = integrantes[v];
        const hora = z < 2 ? "10:00" : "11:15";
        const cancha = CANCHAS[(z % 2) * 2 + c];
        const delPartido = simularEventos(azar, id, [local, visitante], plantel);
        const [gl, gv] = contarGoles(delPartido, local);
        partidos.push([
          id, "zona", zona, null, f + 1, FECHAS_ZONA[f], hora, cancha,
          local, visitante, gl, gv, azar.elegir(sorteo.filter((e) => e !== local && e !== visitante)), "finalizado", null, null,
        ]);
        eventos.push(...delPartido);
      });
    });
  });

  // Fase final: los equipos salen solos de las tablas y de las llaves.
  const finales: [string, string, string, string, string][] = [
    ["CU1", "cuartos", "C1", "06/12/2026", "10:00"],
    ["CU2", "cuartos", "C2", "06/12/2026", "10:00"],
    ["CU3", "cuartos", "C3", "06/12/2026", "10:00"],
    ["CU4", "cuartos", "C4", "06/12/2026", "10:00"],
    ["SE1", "semis", "S1", "12/12/2026", "10:00"],
    ["SE2", "semis", "S2", "12/12/2026", "10:00"],
    ["FIN", "final", "F", "12/12/2026", "12:00"],
  ];
  finales.forEach(([id, fase, llave, fecha, hora], i) => {
    const cancha = fase === "cuartos" ? CANCHAS[i] : fase === "semis" ? CANCHAS[i - 4] : CANCHAS[0];
    partidos.push([id, fase, null, llave, null, fecha, hora, cancha, null, null, null, null, azar.elegir(ARBITROS), "programado", null, null]);
  });

  simularFaseFinal(azar, equipos, partidos, eventos, jugadores, plantel);

  await mkdir(CARPETA, { recursive: true });
  const archivos: [string, readonly string[], Fila[]][] = [
    ["equipos.csv", COLUMNAS.Equipos, equipos],
    ["partidos.csv", COLUMNAS.Partidos, partidos],
    ["eventos.csv", COLUMNAS.Eventos, eventos],
    ["jugadores.csv", COLUMNAS.Jugadores, jugadores],
  ];
  for (const [nombre, columnas, filas] of archivos) {
    await writeFile(path.join(CARPETA, nombre), escribirCsv(columnas, filas));
    console.log(`✓ ${nombre}: ${filas.length} filas`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
