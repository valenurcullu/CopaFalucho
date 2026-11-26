import type { TorneoConfig } from "@/domain/config";
import type { Evento, Partido, SancionManual } from "@/domain/tipos";
import { ORDEN_FASES } from "./llaves";

export type MotivoSancion = "amarillas" | "doble_amarilla" | "roja_directa" | "manual";

export interface Sancion {
  jugadorId: string;
  equipoId: string;
  motivo: MotivoSancion;
  /** Partidos de suspensión. */
  fechas: number;
  /** true si es una roja directa sin fechas cargadas: se cuenta 1 hasta que la comisión decida. */
  aDefinir: boolean;
  /** Partido en el que se ganó la sanción. Vacío en las cargadas a mano. */
  partidoId: string;
  /** Solo en las cargadas a mano: el motivo que escribió la comisión. */
  detalle?: string | null;
  /** Próximo partido que el jugador no puede jugar. Null si ya cumplió o si todavía no está en el fixture. */
  cumpleEnPartidoId: string | null;
  /** Partidos de suspensión ya jugados por el equipo. */
  fechasCumplidas: number;
  cumplida: boolean;
}

/** Desde esta cantidad de fechas, la sanción es por el resto del torneo (se carga como 50). */
const FECHAS_DEL_TORNEO = 20;

export function textoMotivo(s: Pick<Sancion, "motivo" | "fechas" | "aDefinir" | "detalle">): string {
  const fechas = s.fechas >= FECHAS_DEL_TORNEO ? "suspendido del torneo" : `${s.fechas} ${s.fechas === 1 ? "fecha" : "fechas"}`;
  switch (s.motivo) {
    case "amarillas":
      return `Acumulación de amarillas: ${fechas}`;
    case "doble_amarilla":
      return `Doble amarilla: ${fechas}`;
    case "roja_directa":
      return s.aDefinir ? "Roja directa: fechas a definir por la comisión" : `Roja directa: ${fechas}`;
    case "manual":
      return `${s.detalle ?? "Sanción de la comisión"}: ${fechas}`;
  }
}

type PartidoOrdenado = Pick<Partido, "id" | "fase" | "estado" | "localId" | "visitanteId">;

/**
 * Sanciones según el reglamento, a partir de las tarjetas de Eventos:
 * - N amarillas acumuladas (3) → 1 fecha. Se limpian al llegar a la fase configurada (semis).
 * - Doble amarilla en un partido (dos amarillas, o amarilla + roja) → 1 fecha.
 * - Roja directa → las fechas que cargue la comisión en la fila de la roja (si no, 1 "a definir").
 * - Las cargadas a mano (`manuales`) valen desde su partido, o desde el primero del equipo.
 * `partidos` tiene que venir en orden cronológico y con los equipos resueltos.
 */
export function calcularSanciones(
  partidos: readonly PartidoOrdenado[],
  eventos: readonly Evento[],
  reglas: TorneoConfig["sanciones"],
  manuales: readonly SancionManual[] = [],
): Sancion[] {
  const indiceLimpieza = reglas.limpiarAmarillasEn ? ORDEN_FASES.indexOf(reglas.limpiarAmarillasEn) : Infinity;
  const tarjetasPorPartido = new Map<string, Evento[]>();
  for (const e of eventos) {
    if ((e.tipo !== "amarilla" && e.tipo !== "roja") || !e.jugadorId) continue;
    tarjetasPorPartido.set(e.partidoId, [...(tarjetasPorPartido.get(e.partidoId) ?? []), e]);
  }

  const sanciones: Sancion[] = [];
  const equipos = new Set(partidos.flatMap((p) => [p.localId, p.visitanteId]).filter((x): x is string => !!x));

  for (const equipoId of equipos) {
    const delEquipo = partidos.filter((p) => p.localId === equipoId || p.visitanteId === equipoId);
    const acumuladas = new Map<string, number>();
    let limpio = false;

    delEquipo.forEach((partido, i) => {
      if (!limpio && ORDEN_FASES.indexOf(partido.fase) >= indiceLimpieza) {
        acumuladas.clear();
        limpio = true;
      }
      const tarjetas = (tarjetasPorPartido.get(partido.id) ?? []).filter((e) => e.equipoId === equipoId);
      const porJugador = new Map<string, { amarillas: number; rojas: number; fechasRoja: number | null }>();
      for (const t of tarjetas) {
        const c = porJugador.get(t.jugadorId!) ?? { amarillas: 0, rojas: 0, fechasRoja: null };
        if (t.tipo === "amarilla") c.amarillas++;
        else {
          c.rojas++;
          c.fechasRoja = t.fechasSancion ?? c.fechasRoja;
        }
        porJugador.set(t.jugadorId!, c);
      }

      const sancionar = (jugadorId: string, motivo: MotivoSancion, fechas: number, aDefinir = false) => {
        const suspension = delEquipo.slice(i + 1, i + 1 + fechas);
        const jugados = suspension.filter((p) => p.estado === "finalizado").length;
        sanciones.push({
          jugadorId,
          equipoId,
          motivo,
          fechas,
          aDefinir,
          partidoId: partido.id,
          cumpleEnPartidoId: suspension.find((p) => p.estado !== "finalizado")?.id ?? null,
          fechasCumplidas: jugados,
          cumplida: jugados >= fechas,
        });
      };

      for (const [jugadorId, { amarillas, rojas, fechasRoja }] of porJugador) {
        if (amarillas >= 2 || (amarillas >= 1 && rojas >= 1)) {
          // Las amarillas de una expulsión por doble amarilla no se acumulan.
          sancionar(jugadorId, "doble_amarilla", 1);
        } else if (rojas >= 1) {
          if (fechasRoja === null) sancionar(jugadorId, "roja_directa", 1, true);
          else if (fechasRoja > 0) sancionar(jugadorId, "roja_directa", fechasRoja);
        } else if (amarillas === 1) {
          const total = (acumuladas.get(jugadorId) ?? 0) + 1;
          acumuladas.set(jugadorId, total);
          if (total % reglas.amarillasParaSuspension === 0) sancionar(jugadorId, "amarillas", 1);
        }
      }
    });
  }

  for (const m of manuales) {
    const delEquipo = partidos.filter((p) => p.localId === m.equipoId || p.visitanteId === m.equipoId);
    const desde = Math.max(m.desdePartidoId ? delEquipo.findIndex((p) => p.id === m.desdePartidoId) : 0, 0);
    const suspension = delEquipo.slice(desde, desde + m.fechas);
    const jugados = suspension.filter((p) => p.estado === "finalizado").length;
    sanciones.push({
      jugadorId: m.jugadorId,
      equipoId: m.equipoId,
      motivo: "manual",
      detalle: m.motivo,
      fechas: m.fechas,
      aDefinir: false,
      partidoId: "",
      cumpleEnPartidoId: suspension.find((p) => p.estado !== "finalizado")?.id ?? null,
      fechasCumplidas: jugados,
      cumplida: jugados >= m.fechas,
    });
  }
  return sanciones;
}
