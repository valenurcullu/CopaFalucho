import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonCompartir } from "@/components/jugadores/BotonCompartir";
import { Figurita } from "@/components/jugadores/Figurita";
import { Volver } from "@/components/layout/Volver";
import { Esqueleto } from "@/components/ui/basicos";
import { marca } from "@/config/marca";
import { torneoConfig } from "@/config/torneo";
import { obtenerTorneo } from "@/lib/torneo";
import { indices } from "@/lib/torneo/vista";

export async function generateStaticParams() {
  const { jugadores } = await obtenerTorneo();
  if (!torneoConfig.jugadores.mostrarFichas || jugadores.length === 0) return [{ id: "sin-jugadores" }];
  return jugadores.map((j) => ({ id: j.id }));
}

const normalizarId = (crudo: string) => decodeURIComponent(crudo).toUpperCase();

export async function generateMetadata({ params }: PageProps<"/jugadores/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { jugadores } = await obtenerTorneo();
  return { title: jugadores.find((j) => j.id === normalizarId(id))?.nombre ?? "Jugador" };
}

async function Ficha({ params }: { params: PageProps<"/jugadores/[id]">["params"] }) {
  if (!torneoConfig.jugadores.mostrarFichas) notFound();
  const { id } = await params;
  const torneo = await obtenerTorneo();
  const { equipos, jugadores } = indices(torneo);
  const jugador = jugadores.get(normalizarId(id));
  if (!jugador) notFound();
  return (
    <>
      <Volver alternativa={`/equipos/${jugador.equipoId}`} />
      <Figurita
        jugador={jugador}
        equipo={equipos.get(jugador.equipoId) ?? null}
        estadisticas={torneo.estadisticasJugadores[jugador.id] ?? { goles: 0, amarillas: 0, rojas: 0 }}
        edicion={torneoConfig.edicion}
        mostrarPesoAltura={torneoConfig.jugadores.mostrarPesoAltura}
      />
      <BotonCompartir titulo={jugador.nombre} texto={`La figurita de ${jugador.nombre} en la ${marca.nombreTorneo}`} />
    </>
  );
}

export default function PaginaJugador({ params }: PageProps<"/jugadores/[id]">) {
  return (
    <Suspense fallback={<Esqueleto className="mx-auto mt-12 aspect-[5/8] max-w-sm" />}>
      <Ficha params={params} />
    </Suspense>
  );
}
