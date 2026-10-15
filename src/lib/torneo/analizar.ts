import type { LlaveConfig, TorneoConfig } from "@/domain/config";
import type { DatosTorneo, Equipo, Evento, Jugador, Partido } from "@/domain/tipos";
import { tablaGoleadores, tablaTarjetas, estadisticasPorJugador, type EstadisticasJugador, type FilaGoleador, type FilaTarjetas } from "./estadisticas";
import { ErrorFormato, llavesEstandar, ORDEN_FASES, resolverLlaves } from "./llaves";
import { calcularMarcador, ganadorDe, type Marcador } from "./marcador";
import { calcularTabla, tablaGeneral, type FilaGeneral, type FilaTabla } from "./tablas";

export type Resultado = "G" | "E" | "P";

export interface PartidoVista extends Partido {
  /** Nombre de la llave ("Cuartos 1") en fase final. */
  nombreLlave: string | null;
  /** Qué se muestra mientras el equipo no está definido ("1° Zona A"). */
  etiquetaLocal: string | null;
  etiquetaVisitante: string | null;
  /** null si el partido no empezó o faltan equipos. */
  marcador: Marcador | null;
  ganadorId: string | null;
  eventos: Evento[];
}

export interface ZonaVista {
  zona: string;
  completa: boolean;
  tabla: FilaTabla[];
}

export interface LlaveVista {
  id: string;
  fase: LlaveConfig["fase"];
  orden: number;
  nombre: string;
  /** Partido de la planilla para esta llave (puede faltar si no se cargó). */
  partidoId: string | null;
  localId: string | null;
  visitanteId: string | null;
  etiquetaLocal: string;
  etiquetaVisitante: string;
}

export interface Torneo {
  equipos: Equipo[];
  jugadores: Jugador[];
  partidos: PartidoVista[];
  zonas: ZonaVista[];
  /** Clasificados de todas las zonas ordenados entre sí (para los cruces "general"). */
  general: FilaGeneral[];
  llaves: LlaveVista[];
  goleadores: FilaGoleador[];
  tarjetas: FilaTarjetas[];
  /** Últimos resultados de cada equipo, del más viejo al más nuevo. */
  rachas: Record<string, Resultado[]>;
  estadisticasJugadores: Record<string, EstadisticasJugador>;
  /** Problemas de configuración del formato (no de la planilla). */
  erroresFormato: string[];
  avisos: DatosTorneo["avisos"];
  origen: DatosTorneo["origen"];
  actualizadoEn: string;
}

const claveOrden = (p: Partido) =>
  `${p.fecha ?? "9999-99-99"} ${p.hora ?? "99:99"} ${String(ORDEN_FASES.indexOf(p.fase))} ${p.cancha ?? ""} ${p.id}`;

export function ordenarPartidos<T extends Partido>(partidos: readonly T[]): T[] {
  return [...partidos].sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));
}

export function analizarTorneo(datos: DatosTorneo, config: TorneoConfig, largoRacha = 3): Torneo {
  const erroresFormato: string[] = [];
  const eventosPorPartido = new Map<string, Evento[]>();
  for (const e of datos.eventos) {
    const lista = eventosPorPartido.get(e.partidoId) ?? [];
    lista.push(e);
    eventosPorPartido.set(e.partidoId, lista);
  }
  for (const lista of eventosPorPartido.values()) lista.sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999));
  const eventosDe = (id: string) => eventosPorPartido.get(id) ?? [];

  const avisos = [...datos.avisos];

  /** Resultado cargado a mano si está; si no, los goles de Eventos. */
  const marcadorDe = (p: Partido, localId: string | null, visitanteId: string | null): Marcador | null => {
    if (p.estado === "programado" || !localId || !visitanteId) return null;
    if (p.golesLocal !== null && p.golesVisitante !== null) return { local: p.golesLocal, visitante: p.golesVisitante };
    return calcularMarcador(localId, visitanteId, eventosDe(p.id));
  };

  // Si hay resultado cargado y los goles de Eventos son más, algo está mal cargado.
  for (const p of datos.partidos) {
    if (p.golesLocal === null || p.golesVisitante === null || !p.localId || !p.visitanteId) continue;
    const segunEventos = calcularMarcador(p.localId, p.visitanteId, eventosDe(p.id));
    if (segunEventos.local > p.golesLocal || segunEventos.visitante > p.golesVisitante) {
      avisos.push({
        nivel: "advertencia",
        hoja: "Partidos",
        fila: p.fila,
        mensaje: `El partido ${p.id} terminó ${p.golesLocal}-${p.golesVisitante} pero en Eventos hay ${segunEventos.local}-${segunEventos.visitante} en goles`,
      });
    }
  }

  // Zonas
  const nombresZonas = [...new Set(datos.equipos.map((e) => e.zona).filter((z): z is string => !!z))].sort();
  const partidosZona = datos.partidos.filter((p) => p.fase === "zona");
  const zonas: ZonaVista[] = nombresZonas.map((zona) => {
    const equipos = datos.equipos.filter((e) => e.zona === zona).map((e) => e.id);
    const deLaZona = partidosZona.filter((p) => p.zona === zona);
    const finalizados = deLaZona.filter((p) => p.estado === "finalizado");
    const tabla = calcularTabla(
      equipos,
      finalizados.map((p) => ({ id: p.id, localId: p.localId!, visitanteId: p.visitanteId!, marcador: marcadorDe(p, p.localId, p.visitanteId)! })),
      finalizados.flatMap((p) => eventosDe(p.id)),
      config,
    );
    return { zona, completa: deLaZona.length > 0 && finalizados.length === deLaZona.length, tabla };
  });

  // Llaves
  let configLlaves: LlaveConfig[] = [];
  try {
    configLlaves =
      config.formato.llaves === "auto"
        ? llavesEstandar(nombresZonas, config.formato.clasificadosPorZona, config.formato.tercerPuesto, config.formato.cruces)
        : config.formato.llaves;
  } catch (error) {
    if (!(error instanceof ErrorFormato)) throw error;
    erroresFormato.push(error.message);
  }

  const partidoDeLlave = new Map<string, Partido>();
  for (const p of datos.partidos) if (p.fase !== "zona" && p.llave) partidoDeLlave.set(p.llave, p);

  const general = tablaGeneral(zonas, config.formato.clasificadosPorZona, config);
  const zonasCompletas = zonas.length > 0 && zonas.every((z) => z.completa);

  const equipoEnPuesto = (zona: string | null, puesto: number) => {
    if (zona === null) {
      const fila = general[puesto - 1];
      return zonasCompletas && fila && !fila.empateSinResolver ? fila.equipoId : null;
    }
    const z = zonas.find((x) => x.zona === zona);
    const fila = z?.tabla[puesto - 1];
    if (!z?.completa || !fila || fila.empateSinResolver) return null;
    return fila.equipoId;
  };

  let llavesResueltas: ReturnType<typeof resolverLlaves> = [];
  try {
    llavesResueltas = resolverLlaves(
      configLlaves,
      equipoEnPuesto,
      (llaveId, localId, visitanteId) => {
        const p = partidoDeLlave.get(llaveId);
        if (!p) return { ganadorId: null, perdedorId: null };
        const ganadorId = ganadorDe({ ...p, localId, visitanteId }, marcadorDe(p, localId, visitanteId) ?? { local: 0, visitante: 0 });
        return { ganadorId, perdedorId: ganadorId ? (ganadorId === localId ? visitanteId : localId) : null };
      },
      (llaveId) => {
        const p = partidoDeLlave.get(llaveId);
        return { localId: p?.localId ?? null, visitanteId: p?.visitanteId ?? null };
      },
    );
  } catch (error) {
    if (!(error instanceof ErrorFormato)) throw error;
    erroresFormato.push(error.message);
  }
  const llavePorId = new Map(llavesResueltas.map((l) => [l.config.id, l]));

  // Partidos con equipos resueltos y marcador
  const partidos: PartidoVista[] = ordenarPartidos(datos.partidos).map((p) => {
    const llave = p.llave ? llavePorId.get(p.llave) : undefined;
    const localId = p.localId ?? llave?.localId ?? null;
    const visitanteId = p.visitanteId ?? llave?.visitanteId ?? null;
    const marcador = marcadorDe(p, localId, visitanteId);
    return {
      ...p,
      localId,
      visitanteId,
      nombreLlave: llave?.nombre ?? null,
      etiquetaLocal: llave?.etiquetaLocal ?? null,
      etiquetaVisitante: llave?.etiquetaVisitante ?? null,
      marcador,
      ganadorId: marcador && localId && visitanteId ? ganadorDe({ ...p, localId, visitanteId }, marcador) : null,
      eventos: eventosDe(p.id),
    };
  });

  // Rachas: últimos resultados finalizados de cada equipo.
  const rachas: Record<string, Resultado[]> = {};
  for (const equipo of datos.equipos) {
    rachas[equipo.id] = partidos
      .filter((p) => p.estado === "finalizado" && p.marcador && (p.localId === equipo.id || p.visitanteId === equipo.id))
      .slice(-largoRacha)
      .map((p) => {
        const esLocal = p.localId === equipo.id;
        const propios = esLocal ? p.marcador!.local : p.marcador!.visitante;
        const ajenos = esLocal ? p.marcador!.visitante : p.marcador!.local;
        if (propios !== ajenos) return propios > ajenos ? "G" : "P";
        // En fase final, un empate definido por penales cuenta como victoria o derrota.
        if (p.fase !== "zona" && p.ganadorId) return p.ganadorId === equipo.id ? "G" : "P";
        return "E";
      });
  }

  return {
    equipos: [...datos.equipos].sort((a, b) => (a.anio ?? 0) - (b.anio ?? 0) || a.nombre.localeCompare(b.nombre, "es")),
    jugadores: datos.jugadores,
    partidos,
    zonas,
    general,
    llaves: llavesResueltas.map((l) => ({
      id: l.config.id,
      fase: l.config.fase,
      orden: l.config.orden,
      nombre: l.nombre,
      partidoId: partidoDeLlave.get(l.config.id)?.id ?? null,
      localId: l.localId,
      visitanteId: l.visitanteId,
      etiquetaLocal: l.etiquetaLocal,
      etiquetaVisitante: l.etiquetaVisitante,
    })),
    goleadores: tablaGoleadores(datos.eventos, datos.jugadores),
    tarjetas: tablaTarjetas(datos.eventos, datos.jugadores),
    rachas,
    estadisticasJugadores: Object.fromEntries(estadisticasPorJugador(datos.eventos)),
    erroresFormato,
    avisos,
    origen: datos.origen,
    actualizadoEn: datos.actualizadoEn,
  };
}
