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
import { normalizarCodigo, sinAcentos } from "./campos";
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

const normalizarNombre = (s: string) => sinAcentos(s).toLowerCase().replace(/["'“”]/g, "").replace(/\s+/g, " ").trim();

/**
 * Busca jugadores de un equipo por nombre completo, apodo o apellido (este
 * último solo si nadie más del equipo lo comparte).
 */
function indicePorNombre(jugadores: Jugador[]) {
  const indice = new Map<string, Jugador[]>();
  const agregar = (equipoId: string, texto: string | null, j: Jugador) => {
    if (!texto) return;
    const clave = `${equipoId}|${normalizarNombre(texto)}`;
    const lista = indice.get(clave) ?? [];
    if (!lista.includes(j)) lista.push(j);
    indice.set(clave, lista);
  };
  for (const j of jugadores) {
    agregar(j.equipoId, j.nombre, j);
    agregar(j.equipoId, j.apodo, j);
    agregar(j.equipoId, j.nombre.trim().split(/\s+/).at(-1) ?? null, j);
  }
  return (equipoId: string, texto: string): Jugador | null => {
    const lista = indice.get(`${equipoId}|${normalizarNombre(texto)}`);
    return lista?.length === 1 ? lista[0] : null;
  };
}

/** Jugador que aparece en Eventos pero no en la hoja Jugadores. */
function jugadorDesdeEvento(equipoId: string, texto: string, existentes: Map<string, Jugador>): Jugador {
  const base = `${equipoId}-${normalizarCodigo(texto)}`;
  const previo = existentes.get(base);
  if (previo?.soloEnEventos) return previo;
  let id = base;
  for (let n = 2; existentes.has(id) && !existentes.get(id)!.soloEnEventos; n++) id = `${base}-${n}`;
  const nombre = texto.trim().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  return {
    id, equipoId, nombre, apodo: null, numero: null, posicion: null,
    fotoUrl: null, pesoKg: null, alturaCm: null, soloEnEventos: true,
  };
}

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
  const aliasDe = new Map<string, Set<string>>();
  const registrarAlias = (alias: string, equipoId: string) => {
    const clave = normalizarCodigo(alias);
    if (!clave) return;
    aliasDe.set(clave, (aliasDe.get(clave) ?? new Set()).add(equipoId));
  };
  for (const { fila, indice } of validar("Equipos", filaEquipo)) {
    if (equipos.has(fila.id)) {
      avisar("error", "Equipos", indice, `El equipo ${fila.id} está repetido`);
      continue;
    }
    const nombre = fila.nombre ?? (fila.anio !== null ? `Clase ${fila.anio}` : fila.id);
    equipos.set(fila.id, {
      id: fila.id,
      anio: fila.anio,
      zona: fila.zona,
      nombre,
      sigla: fila.sigla ?? (fila.anio !== null ? `’${String(fila.anio).slice(-2)}` : fila.id.slice(0, 4)),
      escudoUrl: fila.escudo_url,
    });
    registrarAlias(fila.id, fila.id);
    registrarAlias(nombre, fila.id);
    if (fila.anio !== null) {
      registrarAlias(String(fila.anio), fila.id);
      // "90" por 1990: se usa mucho al cargar a mano.
      registrarAlias(String(fila.anio).slice(-2), fila.id);
    }
    for (const alias of (fila.alias ?? "").split(",")) registrarAlias(alias, fila.id);
  }

  /** Id del equipo a partir de cómo esté escrito ("90", "1990", "8 y pico"). Null si no existe o es ambiguo. */
  const resolverEquipo = (texto: string | null): string | null => {
    if (!texto) return null;
    const candidatos = aliasDe.get(normalizarCodigo(texto));
    return candidatos?.size === 1 ? [...candidatos][0] : null;
  };

  // Jugadores
  const jugadores = new Map<string, Jugador>();
  for (const { fila, indice } of validar("Jugadores", filaJugador)) {
    if (jugadores.has(fila.id)) {
      avisar("error", "Jugadores", indice, `El jugador ${fila.id} está repetido`);
      continue;
    }
    const equipoId = resolverEquipo(fila.equipo);
    if (!equipoId) {
      avisar("error", "Jugadores", indice, `El equipo ${fila.equipo} no existe en la hoja Equipos`);
      continue;
    }
    jugadores.set(fila.id, {
      id: fila.id,
      equipoId,
      nombre: fila.nombre,
      apodo: fila.apodo,
      numero: fila.numero,
      posicion: fila.posicion,
      fotoUrl: fila.foto_url,
      pesoKg: fila.peso_kg,
      alturaCm: fila.altura_cm,
      soloEnEventos: false,
    });
  }
  const buscarJugador = indicePorNombre([...jugadores.values()]);

  // Partidos
  const partidos = new Map<string, Partido>();
  for (const { fila, indice } of validar("Partidos", filaPartido)) {
    if (partidos.has(fila.id)) {
      avisar("error", "Partidos", indice, `El partido ${fila.id} está repetido`);
      continue;
    }
    const [localId, visitanteId] = [fila.local, fila.visitante].map(resolverEquipo);
    const faltante = fila.local && !localId ? fila.local : fila.visitante && !visitanteId ? fila.visitante : null;
    if (faltante) {
      avisar("error", "Partidos", indice, `El equipo ${faltante} no existe en la hoja Equipos`);
      continue;
    }
    if (localId !== null && localId === visitanteId) {
      avisar("error", "Partidos", indice, "El local y el visitante son el mismo equipo");
      continue;
    }
    let zona = fila.zona;
    if (fila.fase === "zona") {
      if (!localId || !visitanteId) {
        avisar("error", "Partidos", indice, "Un partido de zona necesita local y visitante");
        continue;
      }
      zona ??= equipos.get(localId)!.zona;
      if (!zona) {
        avisar("error", "Partidos", indice, "Falta la zona del partido");
        continue;
      }
    } else if (!fila.llave && (!localId || !visitanteId)) {
      avisar("error", "Partidos", indice, "Un partido de fase final necesita la llave o los dos equipos");
      continue;
    }
    if ((fila.penales_local === null) !== (fila.penales_visitante === null)) {
      avisar("advertencia", "Partidos", indice, "Están cargados los penales de un solo equipo");
    }
    const resultadoCompleto = fila.goles_local !== null && fila.goles_visitante !== null;
    if (!resultadoCompleto && (fila.goles_local !== null || fila.goles_visitante !== null)) {
      avisar("advertencia", "Partidos", indice, "Está cargado el resultado de un solo equipo: se usan los goles de Eventos");
    }
    if (resultadoCompleto && fila.estado === "programado") {
      avisar("advertencia", "Partidos", indice, "Tiene resultado pero el estado dice programado");
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
      localId,
      visitanteId,
      golesLocal: resultadoCompleto ? fila.goles_local : null,
      golesVisitante: resultadoCompleto ? fila.goles_visitante : null,
      arbitro: fila.arbitro,
      arbitroEquipoId: resolverEquipo(fila.arbitro),
      estado: fila.estado,
      penalesLocal: fila.penales_local,
      penalesVisitante: fila.penales_visitante,
      fila: filaPlanilla(indice),
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
    const equipoId = resolverEquipo(fila.equipo);
    if (!equipoId) {
      avisar("error", "Eventos", indice, `El equipo ${fila.equipo} no existe en la hoja Equipos`);
      continue;
    }
    const equiposDelPartido = [partido.localId, partido.visitanteId].filter(Boolean);
    if (equiposDelPartido.length === 2 && !equiposDelPartido.includes(equipoId)) {
      avisar("error", "Eventos", indice, `El equipo ${fila.equipo} no juega el partido ${partido.id}`);
      continue;
    }

    // El jugador se puede escribir por id, nombre, apellido o apodo. Si no está
    // en la hoja Jugadores, se crea igual para que cuente en goleadores y tarjetas.
    let jugadorId: string | null = null;
    if (fila.jugador) {
      const porId = jugadores.get(normalizarCodigo(fila.jugador));
      const encontrado = porId ?? buscarJugador(equipoId, fila.jugador);
      if (encontrado && encontrado.equipoId !== equipoId) {
        avisar("advertencia", "Eventos", indice, `${fila.jugador} no es de ${equipos.get(equipoId)!.nombre}: se cuenta sin jugador`);
      } else if (encontrado) {
        jugadorId = encontrado.id;
      } else {
        const nuevo = jugadorDesdeEvento(equipoId, fila.jugador, jugadores);
        jugadores.set(nuevo.id, nuevo);
        jugadorId = nuevo.id;
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
      equipoId,
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
