import type { Equipo, Jugador, TipoEvento } from "@/domain/tipos";
import { nombreCorto } from "@/lib/formato";
import type { PartidoVista } from "./analizar";

/** Evento listo para mostrar: ya se sabe de qué lado va y quién lo hizo. */
export interface EventoVista {
  id: string;
  tipo: TipoEvento;
  /** Lado al que se le anota: en un gol en contra, el del equipo beneficiado. */
  lado: "local" | "visitante";
  minuto: number | null;
  jugadorId: string | null;
  jugador: string | null;
}

export interface PartidoTarjeta {
  id: string;
  fase: PartidoVista["fase"];
  zona: string | null;
  fechaNro: number | null;
  nombreLlave: string | null;
  fecha: string | null;
  hora: string | null;
  cancha: string | null;
  arbitro: string | null;
  estado: PartidoVista["estado"];
  local: Equipo | null;
  visitante: Equipo | null;
  etiquetaLocal: string | null;
  etiquetaVisitante: string | null;
  marcador: PartidoVista["marcador"];
  penales: { local: number; visitante: number } | null;
  ganadorId: string | null;
  eventos: EventoVista[];
}

export function aTarjeta(p: PartidoVista, equipos: Map<string, Equipo>, jugadores: Map<string, Jugador>): PartidoTarjeta {
  const eventos: EventoVista[] = p.eventos.map((e) => {
    const esDelLocal = e.equipoId === p.localId;
    const lado = (e.tipo === "gol_en_contra" ? !esDelLocal : esDelLocal) ? "local" : "visitante";
    return {
      id: e.id,
      tipo: e.tipo,
      lado,
      minuto: e.minuto,
      jugadorId: e.jugadorId,
      jugador: e.jugadorId && jugadores.has(e.jugadorId) ? nombreCorto(jugadores.get(e.jugadorId)!) : null,
    };
  });
  return {
    id: p.id,
    fase: p.fase,
    zona: p.zona,
    fechaNro: p.fechaNro,
    nombreLlave: p.nombreLlave,
    fecha: p.fecha,
    hora: p.hora,
    cancha: p.cancha,
    // Si arbitra otra clase, se muestra su nombre ("Clase 2000").
    arbitro: p.arbitroEquipoId ? (equipos.get(p.arbitroEquipoId)?.nombre ?? p.arbitro) : p.arbitro,
    estado: p.estado,
    local: p.localId ? (equipos.get(p.localId) ?? null) : null,
    visitante: p.visitanteId ? (equipos.get(p.visitanteId) ?? null) : null,
    etiquetaLocal: p.etiquetaLocal,
    etiquetaVisitante: p.etiquetaVisitante,
    marcador: p.marcador,
    penales:
      p.penalesLocal !== null && p.penalesVisitante !== null ? { local: p.penalesLocal, visitante: p.penalesVisitante } : null,
    ganadorId: p.ganadorId,
    eventos,
  };
}

export function indices(torneo: { equipos: Equipo[]; jugadores: Jugador[] }) {
  return {
    equipos: new Map(torneo.equipos.map((e) => [e.id, e])),
    jugadores: new Map(torneo.jugadores.map((j) => [j.id, j])),
  };
}
