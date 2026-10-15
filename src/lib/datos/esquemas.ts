import { z } from "zod";
import type { EstadoPartido, Fase, Hoja, TipoEvento } from "@/domain/tipos";
import {
  decimalOpcional,
  enteroOpcional,
  fechaOpcional,
  horaOpcional,
  id,
  idOpcional,
  opcion,
  textoOpcional,
  texto,
} from "./campos";

/**
 * Columnas de cada hoja de la planilla, en el orden en que aparecen.
 * Es el contrato con el admin: la planilla de ejemplo se genera desde acá.
 */
export const COLUMNAS: Record<Hoja, readonly string[]> = {
  Equipos: ["id", "año", "zona", "nombre", "sigla", "alias", "escudo_url"],
  Partidos: [
    "id",
    "fase",
    "zona",
    "llave",
    "fecha_nro",
    "fecha",
    "hora",
    "cancha",
    "local",
    "visitante",
    "goles_local",
    "goles_visitante",
    "árbitro",
    "estado",
    "penales_local",
    "penales_visitante",
  ],
  Eventos: ["partido_id", "tipo", "equipo", "jugador", "minuto"],
  Jugadores: ["id", "equipo", "nombre", "apodo", "número", "posición", "foto_url", "peso_kg", "altura_cm"],
};

const ALIAS_FASE: Record<string, Fase> = {
  zona: "zona",
  grupo: "zona",
  grupos: "zona",
  octavos: "octavos",
  "octavos de final": "octavos",
  cuartos: "cuartos",
  "cuartos de final": "cuartos",
  semis: "semis",
  semi: "semis",
  semifinal: "semis",
  semifinales: "semis",
  "tercer puesto": "tercer_puesto",
  "3er puesto": "tercer_puesto",
  "3 puesto": "tercer_puesto",
  final: "final",
};

const ALIAS_ESTADO: Record<string, EstadoPartido> = {
  programado: "programado",
  pendiente: "programado",
  "en juego": "en_juego",
  jugando: "en_juego",
  "en vivo": "en_juego",
  finalizado: "finalizado",
  terminado: "finalizado",
  jugado: "finalizado",
};

const ALIAS_TIPO: Record<string, TipoEvento> = {
  gol: "gol",
  "gol en contra": "gol_en_contra",
  "en contra": "gol_en_contra",
  amarilla: "amarilla",
  "tarjeta amarilla": "amarilla",
  roja: "roja",
  "tarjeta roja": "roja",
};

export const filaEquipo = z
  .object({
    id: idOpcional(),
    anio: enteroOpcional("El año", { min: 1900, max: 2100 }),
    zona: idOpcional(),
    nombre: textoOpcional(),
    sigla: textoOpcional(),
    /** Otros nombres con los que se escribe el equipo, separados por coma: "90, 1990". */
    alias: textoOpcional(),
    escudo_url: textoOpcional(),
  })
  .transform((f, ctx) => {
    const id = f.id ?? (f.anio !== null ? String(f.anio) : null);
    if (!id) {
      ctx.addIssue({ code: "custom", message: "Falta el id o el año del equipo" });
      return z.NEVER;
    }
    return { ...f, id };
  });

export const filaPartido = z.object({
  id: id("el id del partido"),
  fase: opcion("La fase", ALIAS_FASE, "zona"),
  zona: idOpcional(),
  llave: idOpcional(),
  fecha_nro: enteroOpcional("La fecha_nro", { min: 1 }),
  fecha: fechaOpcional(),
  hora: horaOpcional(),
  cancha: textoOpcional(),
  local: idOpcional(),
  visitante: idOpcional(),
  goles_local: enteroOpcional("Los goles del local", { min: 0, max: 99 }),
  goles_visitante: enteroOpcional("Los goles del visitante", { min: 0, max: 99 }),
  arbitro: textoOpcional(),
  estado: opcion("El estado", ALIAS_ESTADO, "programado"),
  penales_local: enteroOpcional("Los penales del local", { min: 0, max: 99 }),
  penales_visitante: enteroOpcional("Los penales del visitante", { min: 0, max: 99 }),
});

export const filaEvento = z.object({
  partido_id: id("el partido_id"),
  tipo: opcion("El tipo", ALIAS_TIPO),
  equipo: id("el equipo"),
  /** Id del jugador ("2001-07"), su nombre o su apodo. */
  jugador: textoOpcional(),
  minuto: enteroOpcional("El minuto", { min: 0, max: 200 }),
});

export const filaJugador = z.object({
  id: id("el id del jugador"),
  equipo: id("el equipo"),
  nombre: texto("el nombre"),
  apodo: textoOpcional(),
  numero: enteroOpcional("El número", { min: 0, max: 999 }),
  posicion: textoOpcional(),
  foto_url: textoOpcional(),
  peso_kg: decimalOpcional("El peso", { min: 35, max: 200 }),
  altura_cm: decimalOpcional("La altura", { min: 120, max: 230 }),
});
