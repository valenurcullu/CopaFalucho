import type { Metadata } from "next";
import { Suspense } from "react";
import { Estadisticas, type FilaStat } from "@/components/estadisticas/Estadisticas";
import { EsqueletoLista, TituloPagina } from "@/components/ui/basicos";
import { torneoConfig } from "@/config/torneo";
import { obtenerTorneo } from "@/lib/torneo";
import { formatearDiaCorto, nombreJugador } from "@/lib/formato";
import { textoMotivo } from "@/lib/torneo/sanciones";
import { indices } from "@/lib/torneo/vista";

export const metadata: Metadata = { title: "Estadísticas" };

async function EstadisticasConDatos() {
  const torneo = await obtenerTorneo();
  const { equipos, jugadores } = indices(torneo);
  const partidos = new Map(torneo.partidos.map((p) => [p.id, p]));
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
      sanciones={torneo.sanciones.map((s) => {
        const j = jugadores.get(s.jugadorId);
        const partido = s.cumpleEnPartidoId ? partidos.get(s.cumpleEnPartidoId) : undefined;
        const rivalId = partido ? (partido.localId === s.equipoId ? partido.visitanteId : partido.localId) : null;
        const rival = rivalId ? equipos.get(rivalId)?.nombre : null;
        return {
          jugadorId: s.jugadorId,
          nombre: j ? nombreJugador(j) : s.jugadorId,
          equipo: equipos.get(s.equipoId)?.nombre ?? "",
          motivo: textoMotivo(s),
          cumpleEn: partido ? `${rival ? `vs. ${rival}` : partido.nombreLlave ?? "el próximo partido"} · ${formatearDiaCorto(partido.fecha)}` : null,
          cumplida: s.cumplida,
        };
      })}
      conFichas={torneoConfig.jugadores.mostrarFichas}
    />
  );
}

export default function PaginaEstadisticas() {
  return (
    <>
      <TituloPagina>Estadísticas</TituloPagina>
      <Suspense fallback={<EsqueletoLista />}>
        <EstadisticasConDatos />
      </Suspense>
    </>
  );
}
