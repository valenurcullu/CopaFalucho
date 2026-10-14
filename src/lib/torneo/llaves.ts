import type { LlaveConfig, OrigenLlave } from "@/domain/config";
import type { Fase } from "@/domain/tipos";

const FASE_POR_EQUIPOS: Record<number, Fase> = { 16: "octavos", 8: "cuartos", 4: "semis", 2: "final" };
const PREFIJO: Record<Fase, string> = {
  zona: "Z", octavos: "O", cuartos: "C", semis: "S", tercer_puesto: "T", final: "F",
};

export const ORDEN_FASES: Fase[] = ["zona", "octavos", "cuartos", "semis", "tercer_puesto", "final"];

export const NOMBRE_FASE: Record<Fase, string> = {
  zona: "Fase de zonas",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semis: "Semifinales",
  tercer_puesto: "Tercer puesto",
  final: "Final",
};

const NOMBRE_CORTO: Record<Fase, string> = {
  zona: "Zona", octavos: "Octavos", cuartos: "Cuartos", semis: "Semi", tercer_puesto: "3er puesto", final: "Final",
};

export class ErrorFormato extends Error {}

/** Orden clásico de cabezas de serie: 1-8, 4-5, 2-7, 3-6… */
function ordenSembrado(n: number): number[] {
  let orden = [1];
  while (orden.length < n) {
    const m = orden.length * 2;
    orden = orden.flatMap((s) => [s, m + 1 - s]);
  }
  return orden;
}

const posicion = (zona: string, puesto: number): OrigenLlave => ({ tipo: "posicion", zona, puesto });

/** Primera ronda: lista ordenada de cruces (de arriba hacia abajo en el cuadro). */
function primeraRonda(zonas: readonly string[], clasificados: number): [OrigenLlave, OrigenLlave][] {
  if (clasificados === 1 && zonas.length % 2 === 0) {
    // 1A-1B, 1C-1D…
    return zonas.flatMap((z, i) => (i % 2 === 0 ? [[posicion(z, 1), posicion(zonas[i + 1], 1)] as [OrigenLlave, OrigenLlave]] : []));
  }
  if (clasificados === 2 && zonas.length % 2 === 0) {
    // Mitad de arriba 1A-2B, 1C-2D…; mitad de abajo 1B-2A, 1D-2C…
    // Así los dos de una misma zona solo se pueden cruzar en la final.
    const pares = zonas.filter((_, i) => i % 2 === 0).map((z, i) => [z, zonas[i * 2 + 1]] as const);
    return [
      ...pares.map(([a, b]): [OrigenLlave, OrigenLlave] => [posicion(a, 1), posicion(b, 2)]),
      ...pares.map(([a, b]): [OrigenLlave, OrigenLlave] => [posicion(b, 1), posicion(a, 2)]),
    ];
  }
  // Caso general: se siembra por puesto y después por zona (1A, 1B…, 2A, 2B…).
  const sembrados = Array.from({ length: clasificados }, (_, p) => zonas.map((z) => posicion(z, p + 1))).flat();
  const orden = ordenSembrado(sembrados.length);
  const cruces: [OrigenLlave, OrigenLlave][] = [];
  for (let i = 0; i < orden.length; i += 2) cruces.push([sembrados[orden[i] - 1], sembrados[orden[i + 1] - 1]]);
  return cruces;
}

/**
 * Arma el cuadro de fase final a partir de las zonas y de cuántos clasifican
 * por zona. La cantidad total de clasificados tiene que ser 2, 4, 8 o 16.
 */
export function llavesEstandar(
  zonas: readonly string[],
  clasificadosPorZona: number,
  tercerPuesto = false,
): LlaveConfig[] {
  const total = zonas.length * clasificadosPorZona;
  if (total < 2) return [];
  if (!FASE_POR_EQUIPOS[total]) {
    throw new ErrorFormato(
      `Con ${zonas.length} zonas y ${clasificadosPorZona} clasificados por zona pasan ${total} equipos. ` +
        `Para armar el cuadro solo se admiten 2, 4, 8 o 16: cambiá clasificadosPorZona o definí las llaves a mano en src/config/torneo.ts.`,
    );
  }

  const llaves: LlaveConfig[] = [];
  let ronda = primeraRonda(zonas, clasificadosPorZona);
  let equipos = total;
  while (ronda.length > 0) {
    const fase = FASE_POR_EQUIPOS[equipos];
    const ids = ronda.map((_, i) => (fase === "final" ? "F" : `${PREFIJO[fase]}${i + 1}`));
    ronda.forEach(([local, visitante], i) => llaves.push({ id: ids[i], fase, orden: i + 1, local, visitante }));
    if (fase === "semis" && tercerPuesto) {
      llaves.push({
        id: "T",
        fase: "tercer_puesto",
        orden: 1,
        local: { tipo: "perdedor", llave: ids[0] },
        visitante: { tipo: "perdedor", llave: ids[1] },
      });
    }
    const siguiente: [OrigenLlave, OrigenLlave][] = [];
    for (let i = 0; i + 1 < ids.length; i += 2) {
      siguiente.push([{ tipo: "ganador", llave: ids[i] }, { tipo: "ganador", llave: ids[i + 1] }]);
    }
    ronda = siguiente;
    equipos /= 2;
  }
  return llaves;
}

/** "Cuartos 2", "Semi 1", "Final". */
export function nombreLlave(llave: Pick<LlaveConfig, "fase" | "orden">, total: number): string {
  if (total === 1) return NOMBRE_CORTO[llave.fase];
  return `${NOMBRE_CORTO[llave.fase]} ${llave.orden}`;
}

/** Texto para mostrar cuando el equipo todavía no está definido. */
export function describirOrigen(origen: OrigenLlave, nombreDe: (llaveId: string) => string): string {
  switch (origen.tipo) {
    case "posicion":
      return `${origen.puesto}° Zona ${origen.zona}`;
    case "ganador":
      return `Ganador ${nombreDe(origen.llave)}`;
    case "perdedor":
      return `Perdedor ${nombreDe(origen.llave)}`;
  }
}

export interface ResultadoLlave {
  ganadorId: string | null;
  perdedorId: string | null;
}

export interface LlaveResuelta {
  config: LlaveConfig;
  nombre: string;
  localId: string | null;
  visitanteId: string | null;
  etiquetaLocal: string;
  etiquetaVisitante: string;
}

/**
 * Resuelve qué equipo ocupa cada lugar del cuadro.
 * - `equipoEnPuesto(zona, puesto)`: id del equipo, o null si la zona no terminó
 *   o hay un empate sin resolver en ese puesto.
 * - `resultado(llaveId, localId, visitanteId)`: ganador y perdedor del partido
 *   de esa llave, si ya se jugó.
 * - `forzados`: equipos cargados a mano en la planilla, que tienen prioridad.
 */
export function resolverLlaves(
  llaves: readonly LlaveConfig[],
  equipoEnPuesto: (zona: string, puesto: number) => string | null,
  resultado: (llaveId: string, localId: string, visitanteId: string) => ResultadoLlave,
  forzados: (llaveId: string) => { localId: string | null; visitanteId: string | null } = () => ({ localId: null, visitanteId: null }),
): LlaveResuelta[] {
  const porId = new Map(llaves.map((l) => [l.id, l]));
  const porFase = new Map<Fase, number>();
  for (const l of llaves) porFase.set(l.fase, (porFase.get(l.fase) ?? 0) + 1);
  const nombreDe = (id: string) => {
    const l = porId.get(id);
    return l ? nombreLlave(l, porFase.get(l.fase)!) : id;
  };

  const resueltas = new Map<string, LlaveResuelta>();
  const resultados = new Map<string, ResultadoLlave>();
  const enCurso = new Set<string>();

  const equipoDe = (origen: OrigenLlave): string | null => {
    if (origen.tipo === "posicion") return equipoEnPuesto(origen.zona, origen.puesto);
    const previa = resolver(origen.llave);
    if (!previa?.localId || !previa.visitanteId) return null;
    const r = resultados.get(origen.llave)!;
    return origen.tipo === "ganador" ? r.ganadorId : r.perdedorId;
  };

  function resolver(id: string): LlaveResuelta | null {
    const ya = resueltas.get(id);
    if (ya) return ya;
    const config = porId.get(id);
    if (!config) return null;
    if (enCurso.has(id)) throw new ErrorFormato(`La llave ${id} depende de sí misma`);
    enCurso.add(id);

    const manual = forzados(id);
    const localId = manual.localId ?? equipoDe(config.local);
    const visitanteId = manual.visitanteId ?? equipoDe(config.visitante);
    const r = localId && visitanteId ? resultado(id, localId, visitanteId) : { ganadorId: null, perdedorId: null };
    resultados.set(id, r);

    const llave: LlaveResuelta = {
      config,
      nombre: nombreDe(id),
      localId,
      visitanteId,
      etiquetaLocal: describirOrigen(config.local, nombreDe),
      etiquetaVisitante: describirOrigen(config.visitante, nombreDe),
    };
    enCurso.delete(id);
    resueltas.set(id, llave);
    return llave;
  }

  return [...llaves]
    .sort((a, b) => ORDEN_FASES.indexOf(a.fase) - ORDEN_FASES.indexOf(b.fase) || a.orden - b.orden)
    .map((l) => resolver(l.id)!);
}
