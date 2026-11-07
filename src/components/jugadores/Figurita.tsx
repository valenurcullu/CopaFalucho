import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconoPelota, Tarjeta } from "@/components/ui/iconos";
import { marca } from "@/config/marca";
import type { Equipo, Jugador } from "@/domain/tipos";
import { datoPorPosicion, promedioGol, type EstadisticasEquipo, type EstadisticasJugador } from "@/lib/torneo/estadisticas";
import { FotoJugador } from "./FotoJugador";

interface Props {
  jugador: Jugador;
  equipo: Equipo | null;
  estadisticas: EstadisticasJugador;
  /** Del equipo del jugador: para el promedio de gol y las vallas invictas. */
  estadisticasEquipo: EstadisticasEquipo;
  edicion: number;
  mostrarPesoAltura: boolean;
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-white/8 px-2 py-1.5">
      <dt className="text-xs font-semibold uppercase tracking-wider opacity-75">{titulo}</dt>
      <dd className="font-titulos text-lg font-bold leading-tight">{valor}</dd>
    </div>
  );
}

/**
 * Ficha del jugador con estética de figurita de álbum: marco rojo, foto
 * grande, número y franja con el nombre.
 */
export function Figurita({ jugador, equipo, estadisticas, estadisticasEquipo, edicion, mostrarPesoAltura }: Props) {
  // Solo los datos que están cargados: a los veteranos sin datos no les aparecen guiones.
  const datos: [string, string][] = [];
  if (equipo) datos.push([equipo.anio ? "Clase" : "Equipo", String(equipo.anio ?? equipo.nombre)]);
  if (jugador.posicion) datos.push(["Posición", jugador.posicion]);
  if (mostrarPesoAltura && jugador.alturaCm) datos.push(["Altura", `${(jugador.alturaCm / 100).toFixed(2).replace(".", ",")} m`]);
  if (mostrarPesoAltura && jugador.pesoKg) datos.push(["Peso", `${String(jugador.pesoKg).replace(".", ",")} kg`]);
  // Con 4 datos van de a 2 por fila, así entran posiciones largas como "Mediocampista".
  const columnas = ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-2"][datos.length];

  // Según la posición: promedio de gol (medio y delantero) o vallas invictas (arquero y defensor).
  const enTorneo: [string, string | number, ReactNode][] = [["Goles", estadisticas.goles, <IconoPelota key="i" />]];
  const extra = datoPorPosicion(jugador.posicion);
  if (extra === "promedio") {
    const promedio = promedioGol(estadisticas.goles, estadisticasEquipo.pj);
    enTorneo.push(["Promedio", promedio === null ? "–" : promedio.toFixed(2).replace(".", ","), null]);
  } else if (extra === "vallas") {
    enTorneo.push(["Vallas invictas", estadisticasEquipo.vallasInvictas, null]);
  }
  enTorneo.push(["Amarillas", estadisticas.amarillas, <Tarjeta key="i" tipo="amarilla" />], ["Rojas", estadisticas.rojas, <Tarjeta key="i" tipo="roja" />]);

  return (
    <article
      aria-label={`Figurita de ${jugador.nombre}`}
      className="mx-auto w-full max-w-sm rounded-[1.75rem] bg-linear-to-b from-secundario to-figurita-marco p-2 shadow-xl"
    >
      <div className="overflow-hidden rounded-[1.35rem] bg-figurita-fondo text-white">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-titulos text-sm font-bold uppercase tracking-[0.2em] text-white">
            {marca.nombreTorneo} {edicion}
          </span>
          <Image src={marca.logo.src} alt="" width={20} height={30} className="h-7 w-auto" />
        </div>

        <div className="relative aspect-[4/5] bg-radial-[at_50%_30%] from-figurita-brillo to-figurita-fondo to-70%">
          <FotoJugador src={jugador.fotoUrl} nombre={jugador.nombre} prioridad />
          {jugador.numero !== null && (
            <span className="absolute left-3 top-2 font-titulos text-6xl font-extrabold leading-none text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
              {jugador.numero}
            </span>
          )}
          {equipo && (
            <Link
              href={`/equipos/${equipo.id}`}
              className="absolute right-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur"
            >
              {equipo.nombre}
            </Link>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-secundario px-4 py-2 text-secundario-texto">
            <h1 className="truncate font-titulos text-2xl font-extrabold uppercase leading-tight tracking-wide">{jugador.nombre}</h1>
            {jugador.apodo && <p className="truncate text-sm font-semibold opacity-90">“{jugador.apodo}”</p>}
          </div>
        </div>

        <dl className={`grid gap-2 p-3 text-center ${columnas}`}>
          {datos.map(([t, v]) => (
            <Dato key={t} titulo={t} valor={v} />
          ))}
        </dl>

        <div className="border-t border-white/15 px-3 pb-3 pt-2">
          <h2 className="mb-1.5 text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-75">En el torneo</h2>
          <dl className={`grid gap-1 text-center ${enTorneo.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {enTorneo.map(([titulo, valor, icono]) => (
              <div key={titulo} className="flex flex-col justify-end">
                <dt className="flex items-center justify-center gap-1 text-xs leading-tight opacity-80">
                  {icono} {titulo}
                </dt>
                <dd className="font-titulos text-3xl font-extrabold">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}
