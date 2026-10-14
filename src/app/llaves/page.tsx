import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoFormato } from "@/components/layout/AvisoFormato";
import { Cuadro, type CruceCuadro } from "@/components/llaves/Cuadro";
import { Esqueleto, TituloPagina, Vacio } from "@/components/ui/basicos";
import { obtenerTorneo } from "@/lib/torneo";
import { aTarjeta, indices } from "@/lib/torneo/vista";

export const metadata: Metadata = { title: "Llaves" };

async function Llaves() {
  const torneo = await obtenerTorneo();
  const { equipos, jugadores } = indices(torneo);
  const partidos = new Map(torneo.partidos.map((p) => [p.id, p]));

  const cruces: CruceCuadro[] = torneo.llaves.map((l) => {
    const partido = l.partidoId ? partidos.get(l.partidoId) : undefined;
    const localId = partido?.localId ?? l.localId;
    const visitanteId = partido?.visitanteId ?? l.visitanteId;
    return {
      id: l.id,
      fase: l.fase,
      nombre: l.nombre,
      partido: partido ? aTarjeta(partido, equipos, jugadores) : null,
      local: localId ? (equipos.get(localId) ?? null) : null,
      visitante: visitanteId ? (equipos.get(visitanteId) ?? null) : null,
      etiquetaLocal: l.etiquetaLocal,
      etiquetaVisitante: l.etiquetaVisitante,
    };
  });

  const final = cruces.find((c) => c.fase === "final");
  const campeonId = final?.partido?.ganadorId;

  return (
    <>
      <AvisoFormato torneo={torneo} />
      {cruces.length === 0 ? (
        <Vacio>El cuadro de fase final todavía no está armado.</Vacio>
      ) : (
        <Cuadro cruces={cruces} campeon={campeonId ? (equipos.get(campeonId) ?? null) : null} />
      )}
      <p className="mt-2 text-xs text-texto-suave">
        Los cruces se completan solos cuando termina cada zona y cada llave. Si una llave termina empatada, define por penales.
      </p>
    </>
  );
}

export default function PaginaLlaves() {
  return (
    <>
      <TituloPagina>Llaves</TituloPagina>
      <Suspense fallback={<Esqueleto className="h-96" />}>
        <Llaves />
      </Suspense>
    </>
  );
}
