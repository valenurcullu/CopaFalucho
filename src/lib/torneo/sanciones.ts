import type { TorneoConfig } from "@/domain/config";
import type { Evento, Partido } from "@/domain/tipos";
import { ORDEN_FASES } from "./llaves";

export type MotivoSancion = "amarillas" | "doble_amarilla" | "roja_directa";

export interface Sancion {
  jugadorId: string;
  equipoId: string;
  motivo: MotivoSancion;
  /** Partido en el que se ganó la sanción. */
  partidoId: string;
  /** Próximo partido del equipo, que el jugador no puede jugar. Null si todavía no está en el fixture. */
  cumpleEnPartidoId: string | null;
  /** true cuando ese próximo partido ya se jugó. */
  cumplida: boolean;
}

export const TEXTO_MOTIVO: Record<MotivoSancion, string> = {
  amarillas: "Acumulación de amarillas: 1 fecha",
  doble_amarilla: "Doble amarilla: 1 fecha",
  roja_directa: "Roja directa: la comisión define las fechas",
};

type PartidoOrdenado = Pick<Partido, "id" | "fase" | "estado" | "localId" | "visitanteId">;

/**
 * Sanciones según el reglamento, a partir de las tarjetas de Eventos:
 * - N amarillas acumuladas (3) → 1 fecha. Se limpian al llegar a la fase configurada (semis).
 * - Doble amarilla en un partido (dos amarillas, o amarilla + roja) → 1 fecha.
 * - Roja directa → al menos el próximo partido; las fechas las define la comisión.
 * `partidos` tiene que venir en orden cronológico y con los equipos resueltos.
 */
export function calcularSanciones(
  partidos: readonly PartidoOrdenado[],
  eventos: readonly Evento[],
  reglas: TorneoConfig["sanciones"],
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
      const porJugador = new Map<string, { amarillas: number; rojas: number }>();
      for (const t of tarjetas) {
        const c = porJugador.get(t.jugadorId!) ?? { amarillas: 0, rojas: 0 };
        if (t.tipo === "amarilla") c.amarillas++;
        else c.rojas++;
        porJugador.set(t.jugadorId!, c);
      }

      const siguiente = delEquipo[i + 1] ?? null;
      const sancionar = (jugadorId: string, motivo: MotivoSancion) =>
        sanciones.push({
          jugadorId,
          equipoId,
          motivo,
          partidoId: partido.id,
          cumpleEnPartidoId: siguiente?.id ?? null,
          cumplida: siguiente?.estado === "finalizado",
        });

      for (const [jugadorId, { amarillas, rojas }] of porJugador) {
        if (amarillas >= 2 || (amarillas >= 1 && rojas >= 1)) {
          // Las amarillas de una expulsión por doble amarilla no se acumulan.
          sancionar(jugadorId, "doble_amarilla");
        } else if (rojas >= 1) {
          sancionar(jugadorId, "roja_directa");
        } else if (amarillas === 1) {
          const total = (acumuladas.get(jugadorId) ?? 0) + 1;
          acumuladas.set(jugadorId, total);
          if (total % reglas.amarillasParaSuspension === 0) sancionar(jugadorId, "amarillas");
        }
      }
    });
  }
  return sanciones;
}
