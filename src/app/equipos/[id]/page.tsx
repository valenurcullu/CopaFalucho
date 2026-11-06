import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FotoJugador } from "@/components/jugadores/FotoJugador";
import { Volver } from "@/components/layout/Volver";
import { TarjetaPartido } from "@/components/partidos/TarjetaPartido";
import { Esqueleto, EsqueletoLista, Tarjeta, TituloSeccion, Vacio } from "@/components/ui/basicos";
import { EscudoClase } from "@/components/ui/EscudoClase";
import { IconoFlecha, IconoPelota } from "@/components/ui/iconos";
import { Racha } from "@/components/ui/Racha";
import { torneoConfig } from "@/config/torneo";
import { formatearDiaCorto, nombreJugador } from "@/lib/formato";
import { obtenerTorneo } from "@/lib/torneo";
import { textoMotivo } from "@/lib/torneo/sanciones";
import { aTarjeta, indices } from "@/lib/torneo/vista";

export async function generateStaticParams() {
  const { equipos } = await obtenerTorneo();
  // Con Cache Components hace falta al menos un parámetro, aunque la planilla esté vacía.
  return equipos.length > 0 ? equipos.map((e) => ({ id: e.id })) : [{ id: "sin-equipos" }];
}

export async function generateMetadata({ params }: PageProps<"/equipos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { equipos } = await obtenerTorneo();
  return { title: equipos.find((e) => e.id === decodeURIComponent(id).toUpperCase())?.nombre ?? "Equipo" };
}

const ORDEN_POSICION = ["arquero", "defensor", "mediocampista", "delantero"];
const ordenPosicion = (p: string | null) => {
  const i = ORDEN_POSICION.indexOf((p ?? "").toLowerCase());
  return i === -1 ? ORDEN_POSICION.length : i;
};

async function DetalleEquipo({ params }: { params: PageProps<"/equipos/[id]">["params"] }) {
  const { id: crudo } = await params;
  const id = decodeURIComponent(crudo).toUpperCase();
  const torneo = await obtenerTorneo();
  const { equipos, jugadores } = indices(torneo);
  const equipo = equipos.get(id);
  if (!equipo) notFound();

  const zona = torneo.zonas.find((z) => z.zona === equipo.zona);
  const fila = zona?.tabla.find((f) => f.equipoId === id);
  const partidos = torneo.partidos.filter((p) => p.localId === id || p.visitanteId === id);
  const plantel = torneo.jugadores
    .filter((j) => j.equipoId === id)
    .sort((a, b) => ordenPosicion(a.posicion) - ordenPosicion(b.posicion) || (a.numero ?? 999) - (b.numero ?? 999));
  const { mostrarFichas } = torneoConfig.jugadores;
  const suspendidos = torneo.sanciones.filter((s) => s.equipoId === id && !s.cumplida);
  // Zonas impares: fechas de la zona en las que este equipo no juega.
  const fechasDeZona = new Map<number, string | null>();
  for (const p of torneo.partidos) {
    if (p.fase === "zona" && p.zona === equipo.zona && p.fechaNro !== null && !fechasDeZona.has(p.fechaNro)) fechasDeZona.set(p.fechaNro, p.fecha);
  }
  const fechasQueJuega = new Set(partidos.filter((p) => p.fase === "zona").map((p) => p.fechaNro));
  const fechasLibres = [...fechasDeZona].filter(([n]) => !fechasQueJuega.has(n)).sort(([a], [b]) => a - b);

  return (
    <>
      <Tarjeta className="flex items-center gap-4 p-4">
        <EscudoClase equipo={equipo} tamanio="lg" />
        <div className="min-w-0">
          <h1 className="font-titulos text-3xl font-extrabold uppercase leading-none tracking-wide">{equipo.nombre}</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {equipo.zona ? `Zona ${equipo.zona}` : "Sin zona"}
            {fila && ` · ${fila.posicion}° con ${fila.pts} pts`}
          </p>
          <div className="mt-1.5">
            <Racha resultados={torneo.rachas[id] ?? []} />
          </div>
        </div>
      </Tarjeta>

      {fila && (
        <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            ["PJ", fila.pj],
            ["GF", fila.gf],
            ["GC", fila.gc],
            ["Fair play", fila.fairPlay],
          ].map(([titulo, valor]) => (
            <Tarjeta key={titulo} className="px-1 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-texto-suave">{titulo}</dt>
              <dd className="font-titulos text-2xl font-bold tabular-nums">{valor}</dd>
            </Tarjeta>
          ))}
        </dl>
      )}

      {suspendidos.length > 0 && (
        <div role="note" className="mt-3 rounded-2xl border border-secundario/40 bg-secundario/8 p-3 text-sm">
          <p className="font-semibold text-secundario">Suspendidos para el próximo partido</p>
          <ul className="mt-1 space-y-0.5">
            {suspendidos.map((s) => {
              const j = jugadores.get(s.jugadorId);
              return (
                <li key={`${s.jugadorId}-${s.partidoId}`}>
                  {j ? nombreJugador(j) : s.jugadorId} <span className="text-texto-suave">· {textoMotivo(s)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <TituloSeccion>Partidos</TituloSeccion>
      {fechasLibres.length > 0 && (
        <p className="mb-3 text-sm text-texto-suave">
          <span className="font-semibold">Fecha libre:</span>{" "}
          {fechasLibres.map(([n, fecha]) => `Fecha ${n}${fecha ? ` (${formatearDiaCorto(fecha)})` : ""}`).join(" · ")}
        </p>
      )}
      {partidos.length === 0 ? (
        <Vacio>Todavía no tiene partidos cargados.</Vacio>
      ) : (
        <div className="flex flex-col gap-3">
          {partidos.map((p) => (
            <TarjetaPartido key={p.id} partido={aTarjeta(p, equipos, jugadores)} conFichas={mostrarFichas} mostrarFecha={formatearDiaCorto(p.fecha)} />
          ))}
        </div>
      )}

      <TituloSeccion extra={<span className="text-sm text-texto-suave">{plantel.length} jugadores</span>}>Plantel</TituloSeccion>
      {plantel.length === 0 ? (
        <Vacio>Todavía no hay jugadores cargados.</Vacio>
      ) : (
        <Tarjeta>
          <ul>
            {plantel.map((j) => {
              const stats = torneo.estadisticasJugadores[j.id];
              const contenido = (
                <>
                  {j.numero !== null ? (
                    <span className="w-8 shrink-0 text-center font-titulos text-xl font-bold text-enlace">{j.numero}</span>
                  ) : (
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-figurita-fondo">
                      <FotoJugador src={j.fotoUrl} nombre={j.nombre} tamanios="36px" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{nombreJugador(j)}</span>
                    {j.posicion && <span className="block text-xs text-texto-suave">{j.posicion}</span>}
                  </span>
                  {stats?.goles ? (
                    <span className="flex items-center gap-1 text-sm font-semibold tabular-nums" aria-label={`${stats.goles} goles`}>
                      {stats.goles} <IconoPelota />
                    </span>
                  ) : null}
                  {mostrarFichas && <IconoFlecha className="size-4 text-texto-suave" />}
                </>
              );
              return (
                <li key={j.id} className="border-b border-borde last:border-0">
                  {mostrarFichas ? (
                    <Link href={`/jugadores/${j.id}`} prefetch={false} className="flex min-h-14 items-center gap-3 px-3 active:bg-superficie-alt">
                      {contenido}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-3">{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}

export default function PaginaEquipo({ params }: PageProps<"/equipos/[id]">) {
  return (
    <>
      <Volver alternativa="/equipos" texto="Equipos" />
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <Esqueleto className="h-24" />
            <EsqueletoLista filas={3} />
          </div>
        }
      >
        <DetalleEquipo params={params} />
      </Suspense>
    </>
  );
}
