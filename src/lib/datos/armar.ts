import type { z } from "zod";
import type {
  AvisoDatos,
  DatosTorneo,
  Equipo,
  Evento,
  Hoja,
  Jugador,
  Partido,
} from "@/domain/tipos";
import type { FilaCruda } from "./csv";
import { filaEquipo, filaEvento, filaJugador, filaPartido } from "./esquemas";

export type HojasCrudas = Record<Hoja, FilaCruda[]>;

interface Opciones {
  origen: DatosTorneo["origen"];
  duracionMinutos: number;
  ahora?: Date;
}

const ORDEN_HOJAS: Hoja[] = ["Equipos", "Jugadores", "Partidos", "Eventos"];

/** Fila 1 = encabezado, así que el índice 0 es la fila 2 de la planilla. */
const filaPlanilla = (indice: number) => indice + 2;

/**
 * Convierte las hojas crudas en datos del torneo. Nunca tira error por una
 * fila mal cargada: la saltea y deja un aviso para que el admin la corrija.
 */
export function armarDatos(hojas: HojasCrudas, opciones: Opciones): DatosTorneo {
  const avisos: AvisoDatos[] = [];
  const avisar = (nivel: AvisoDatos["nivel"], hoja: Hoja, indice: number, mensaje: string) =>
    avisos.push({ nivel, hoja, fila: filaPlanilla(indice), mensaje });

  function validar<S extends z.ZodType>(hoja: Hoja, esquema: S): { fila: z.output<S>; indice: number }[] {
    const validas: { fila: z.output<S>; indice: number }[] = [];
    hojas[hoja].forEach((cruda, indice) => {
      const r = esquema.safeParse(cruda);
      if (r.success) validas.push({ fila: r.data, indice });
      else avisar("error", hoja, indice, r.error.issues.map((i) => i.message).join(". "));
    });
    return validas;
  }

  // Equipos
  const equipos = new Map<string, Equipo>();
  for (const { fila, indice } of validar("Equipos", filaEquipo)) {
    if (equipos.has(fila.id)) {
      avisar("error", "Equipos", indice, `El equipo ${fila.id} está repetido`);
      continue;
    }
    equipos.set(fila.id, {
      id: fila.id,
      anio: fila.anio,
      zona: fila.zona,
      nombre: fila.nombre ?? `Clase ${fila.anio}`,
      escudoUrl: fila.escudo_url,
    });
  }

  // Jugadores
  const jugadores = new Map<string, Jugador>();
  for (const { fila, indice } of validar("Jugadores", filaJugador)) {
    if (jugadores.has(fila.id)) {
      avisar("error", "Jugadores", indice, `El jugador ${fila.id} está repetido`);
      continue;
    }
    if (!equipos.has(fila.equipo)) {
      avisar("error", "Jugadores", indice, `El equipo ${fila.equipo} no existe en la hoja Equipos`);
      continue;
    }
    jugadores.set(fila.id, {
      id: fila.id,
      equipoId: fila.equipo,
      nombre: fila.nombre,
      numero: fila.numero,
      posicion: fila.posicion,
      fotoUrl: fila.foto_url,
      pesoKg: fila.peso_kg,
      alturaCm: fila.altura_cm,
    });
  }

  // Partidos
  const partidos = new Map<string, Partido>();
  for (const { fila, indice } of validar("Partidos", filaPartido)) {
    if (partidos.has(fila.id)) {
      avisar("error", "Partidos", indice, `El partido ${fila.id} está repetido`);
      continue;
    }
    const faltante = [fila.local, fila.visitante].find((e) => e !== null && !equipos.has(e));
    if (faltante) {
      avisar("error", "Partidos", indice, `El equipo ${faltante} no existe en la hoja Equipos`);
      continue;
    }
    if (fila.local !== null && fila.local === fila.visitante) {
      avisar("error", "Partidos", indice, "El local y el visitante son el mismo equipo");
      continue;
    }
    let zona = fila.zona;
    if (fila.fase === "zona") {
      if (!fila.local || !fila.visitante) {
        avisar("error", "Partidos", indice, "Un partido de zona necesita local y visitante");
        continue;
      }
      zona ??= equipos.get(fila.local)!.zona;
      if (!zona) {
        avisar("error", "Partidos", indice, "Falta la zona del partido");
        continue;
      }
    } else if (!fila.llave && (!fila.local || !fila.visitante)) {
      avisar("error", "Partidos", indice, "Un partido de fase final necesita la llave o los dos equipos");
      continue;
    }
    if ((fila.penales_local === null) !== (fila.penales_visitante === null)) {
      avisar("advertencia", "Partidos", indice, "Están cargados los penales de un solo equipo");
    }
    partidos.set(fila.id, {
      id: fila.id,
      fase: fila.fase,
      zona: fila.fase === "zona" ? zona : null,
      llave: fila.llave,
      fechaNro: fila.fecha_nro,
      fecha: fila.fecha,
      hora: fila.hora,
      cancha: fila.cancha,
      localId: fila.local,
      visitanteId: fila.visitante,
      arbitro: fila.arbitro,
      estado: fila.estado,
      penalesLocal: fila.penales_local,
      penalesVisitante: fila.penales_visitante,
    });
  }

  // Eventos
  const eventos: Evento[] = [];
  for (const { fila, indice } of validar("Eventos", filaEvento)) {
    const partido = partidos.get(fila.partido_id);
    if (!partido) {
      avisar("error", "Eventos", indice, `El partido ${fila.partido_id} no existe en la hoja Partidos`);
      continue;
    }
    if (!equipos.has(fila.equipo)) {
      avisar("error", "Eventos", indice, `El equipo ${fila.equipo} no existe en la hoja Equipos`);
      continue;
    }
    const equiposDelPartido = [partido.localId, partido.visitanteId].filter(Boolean);
    if (equiposDelPartido.length === 2 && !equiposDelPartido.includes(fila.equipo)) {
      avisar("error", "Eventos", indice, `El equipo ${fila.equipo} no juega el partido ${partido.id}`);
      continue;
    }
    let jugadorId = fila.jugador_id;
    if (jugadorId) {
      const jugador = jugadores.get(jugadorId);
      if (!jugador) {
        avisar("advertencia", "Eventos", indice, `El jugador ${jugadorId} no existe: se cuenta sin jugador`);
        jugadorId = null;
      } else if (jugador.equipoId !== fila.equipo) {
        avisar("advertencia", "Eventos", indice, `El jugador ${jugadorId} no es del equipo ${fila.equipo}: se cuenta sin jugador`);
        jugadorId = null;
      }
    }
    if (fila.minuto !== null && fila.minuto > opciones.duracionMinutos + 15) {
      avisar("advertencia", "Eventos", indice, `Minuto ${fila.minuto} mayor que la duración del partido`);
    }
    if (partido.estado === "programado") {
      avisar("advertencia", "Eventos", indice, `El partido ${partido.id} figura como programado pero tiene eventos`);
    }
    eventos.push({
      id: `E${filaPlanilla(indice)}`,
      partidoId: partido.id,
      tipo: fila.tipo,
      equipoId: fila.equipo,
      jugadorId,
      minuto: fila.minuto,
    });
  }

  return {
    equipos: [...equipos.values()],
    partidos: [...partidos.values()],
    eventos,
    jugadores: [...jugadores.values()],
    avisos: avisos.sort((a, b) => ORDEN_HOJAS.indexOf(a.hoja) - ORDEN_HOJAS.indexOf(b.hoja) || a.fila - b.fila),
    origen: opciones.origen,
    actualizadoEn: (opciones.ahora ?? new Date()).toISOString(),
  };
}
