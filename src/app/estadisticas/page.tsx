import type { Metadata } from "next";
import { Suspense } from "react";
import { Estadisticas, type FilaStat } from "@/components/estadisticas/Estadisticas";
import { EsqueletoLista, TituloPagina } from "@/components/ui/basicos";
import { torneoConfig } from "@/config/torneo";
import { obtenerTorneo } from "@/lib/torneo";
import { nombreJugador } from "@/lib/formato";
import { indices } from "@/lib/torneo/vista";

export const metadata: Metadata = { title: "Estadísticas" };

async function EstadisticasConDatos() {
  const torneo = await obtenerTorneo();
  const { equipos, jugadores } = indices(torneo);
  const fila = (f: { posicion: number; jugadorId: string; equipoId: string }): FilaStat => {
    const j = jugadores.get(f.jugadorId);
    return {
      posicion: f.posicion,
      jugadorId: f.jugadorId,
      nombre: j ? nombreJugador(j) : f.jugadorId,
      numero: j?.numero ?? null,
      equipo: equipos.get(f.equipoId)?.nombre ?? "",
    };
  };
  return (
    <Estadisticas
      goleadores={torneo.goleadores.map((g) => ({ ...fila(g), goles: g.goles }))}
      tarjetas={torneo.tarjetas.map((t) => ({ ...fila(t), rojas: t.rojas, amarillas: t.amarillas }))}
      conFichas={torneoConfig.jugadores.mostrarFichas}
    />
  );
}

export default function PaginaEstadisticas() {
  return (
    <>
      <TituloPagina bajada="Incluye los partidos en juego.">Estadísticas</TituloPagina>
      <Suspense fallback={<EsqueletoLista />}>
        <EstadisticasConDatos />
      </Suspense>
    </>
  );
}
