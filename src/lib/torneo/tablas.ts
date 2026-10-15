import type { CriterioDesempate, TorneoConfig } from "@/domain/config";
import type { Evento } from "@/domain/tipos";
import type { Marcador } from "./marcador";

export interface PartidoTabla {
  id: string;
  localId: string;
  visitanteId: string;
  marcador: Marcador;
}

export interface FilaTabla {
  equipoId: string;
  posicion: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  amarillas: number;
  rojas: number;
  /** Puntos de fair play: menos es mejor. */
  fairPlay: number;
  /** Quedó igualado con otro equipo en todos los criterios configurados. */
  empateSinResolver: boolean;
}

type Reglas = Pick<TorneoConfig, "puntos" | "desempate" | "fairPlay">;

function filaVacia(equipoId: string): FilaTabla {
  return {
    equipoId, posicion: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
    amarillas: 0, rojas: 0, fairPlay: 0, empateSinResolver: false,
  };
}

/** Suma partidos a las filas de los equipos indicados. */
function acumular(equipoIds: readonly string[], partidos: readonly PartidoTabla[], reglas: Reglas) {
  const filas = new Map(equipoIds.map((id) => [id, filaVacia(id)]));
  for (const p of partidos) {
    const local = filas.get(p.localId);
    const visitante = filas.get(p.visitanteId);
    if (!local || !visitante) continue;
    const { local: gl, visitante: gv } = p.marcador;
    for (const [fila, gf, gc] of [[local, gl, gv], [visitante, gv, gl]] as const) {
      fila.pj++;
      fila.gf += gf;
      fila.gc += gc;
      if (gf > gc) {
        fila.pg++;
        fila.pts += reglas.puntos.victoria;
      } else if (gf === gc) {
        fila.pe++;
        fila.pts += reglas.puntos.empate;
      } else {
        fila.pp++;
        fila.pts += reglas.puntos.derrota;
      }
    }
  }
  for (const f of filas.values()) f.dg = f.gf - f.gc;
  return filas;
}

/** Agrupa una lista ya ordenada en tramos con el mismo valor. */
function agruparIguales<T>(lista: T[], valor: (x: T) => number): T[][] {
  const grupos: T[][] = [];
  for (const x of lista) {
    const ultimo = grupos.at(-1);
    if (ultimo && valor(ultimo[0]) === valor(x)) ultimo.push(x);
    else grupos.push([x]);
  }
  return grupos;
}

/**
 * Ordena la tabla de una zona. Primero puntos; los empatados se separan
 * aplicando los criterios en el orden configurado. Un criterio que separa a
 * algunos equipos deja a los que siguen igualados para el criterio siguiente.
 */
export function calcularTabla(
  equipoIds: readonly string[],
  partidos: readonly PartidoTabla[],
  tarjetas: readonly Pick<Evento, "equipoId" | "tipo">[],
  reglas: Reglas,
): FilaTabla[] {
  const filas = acumular(equipoIds, partidos, reglas);
  for (const t of tarjetas) {
    const fila = filas.get(t.equipoId);
    if (!fila) continue;
    if (t.tipo === "amarilla") fila.amarillas++;
    if (t.tipo === "roja") fila.rojas++;
  }
  for (const f of filas.values()) {
    f.fairPlay = f.amarillas * reglas.fairPlay.amarilla + f.rojas * reglas.fairPlay.roja;
  }

  /** Valor de un criterio para cada equipo de un grupo empatado: más es mejor. */
  const valor = (criterio: CriterioDesempate, grupo: FilaTabla[]): Map<string, number> => {
    switch (criterio) {
      case "diferencia_gol":
        return new Map(grupo.map((f) => [f.equipoId, f.dg]));
      case "goles_a_favor":
        return new Map(grupo.map((f) => [f.equipoId, f.gf]));
      case "fair_play":
        return new Map(grupo.map((f) => [f.equipoId, -f.fairPlay]));
      case "enfrentamiento_directo": {
        const ids = grupo.map((f) => f.equipoId);
        const entreEllos = partidos.filter((p) => ids.includes(p.localId) && ids.includes(p.visitanteId));
        const mini = acumular(ids, entreEllos, reglas);
        // Puntos en los partidos entre ellos. Si siguen iguales (por ejemplo un
        // triple empate en círculo), decide el criterio siguiente.
        return new Map(ids.map((id) => [id, mini.get(id)!.pts]));
      }
    }
  };

  const desempatar = (grupo: FilaTabla[], criterios: CriterioDesempate[]): FilaTabla[][] => {
    if (grupo.length < 2 || criterios.length === 0) return [grupo];
    const [criterio, ...resto] = criterios;
    const valores = valor(criterio, grupo);
    const ordenado = [...grupo].sort((a, b) => valores.get(b.equipoId)! - valores.get(a.equipoId)!);
    return agruparIguales(ordenado, (f) => valores.get(f.equipoId)!).flatMap((g) => desempatar(g, resto));
  };

  const porPuntos = [...filas.values()].sort((a, b) => b.pts - a.pts);
  const grupos = agruparIguales(porPuntos, (f) => f.pts).flatMap((g) => desempatar(g, reglas.desempate));

  let posicion = 0;
  return grupos.flatMap((grupo) => {
    const empatados = grupo.length > 1;
    return [...grupo]
      .sort((a, b) => a.equipoId.localeCompare(b.equipoId))
      .map((f) => ({ ...f, posicion: ++posicion, empateSinResolver: empatados }));
  });
}

export interface FilaGeneral extends FilaTabla {
  zona: string;
  /** Puesto dentro de su zona. */
  puestoZona: number;
}

/**
 * Tabla general de los clasificados de todas las zonas, para sembrar los
 * cruces. Como son de zonas distintas no se usa el enfrentamiento directo.
 */
export function tablaGeneral(
  zonas: readonly { zona: string; tabla: readonly FilaTabla[] }[],
  clasificadosPorZona: number,
  reglas: Reglas,
): FilaGeneral[] {
  const filas = zonas.flatMap((z) =>
    z.tabla.slice(0, clasificadosPorZona).map((f) => ({ ...f, zona: z.zona, puestoZona: f.posicion })),
  );
  const criterios = reglas.desempate.filter((c) => c !== "enfrentamiento_directo");
  const valor = (c: CriterioDesempate, f: FilaTabla) => (c === "diferencia_gol" ? f.dg : c === "goles_a_favor" ? f.gf : -f.fairPlay);
  const comparar = (a: FilaGeneral, b: FilaGeneral) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    for (const c of criterios) if (valor(c, b) !== valor(c, a)) return valor(c, b) - valor(c, a);
    return 0;
  };
  const ordenadas = [...filas].sort((a, b) => comparar(a, b) || a.puestoZona - b.puestoZona || a.zona.localeCompare(b.zona));
  return ordenadas.map((f, i) => ({
    ...f,
    posicion: i + 1,
    empateSinResolver: ordenadas.some((o) => o !== f && comparar(o, f) === 0),
  }));
}
