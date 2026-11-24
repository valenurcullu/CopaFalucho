import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TablaGeneral } from "@/components/tablas/TablaGeneral";
import { TablaZona } from "@/components/tablas/TablaZona";
import { EsqueletoLista, TituloPagina, Vacio } from "@/components/ui/basicos";
import { torneoConfig } from "@/config/torneo";
import { obtenerTorneo } from "@/lib/torneo";
import { indices } from "@/lib/torneo/vista";

export const metadata: Metadata = { title: "Tablas" };

const NOMBRE_CRITERIO = {
  diferencia_gol: "diferencia de gol",
  goles_a_favor: "goles a favor",
  fair_play: "fair play",
  enfrentamiento_directo: "partido entre los empatados",
  goles_en_contra: "menos goles en contra",
  ranking_anterior: "ranking del año anterior",
} as const;

async function Tablas() {
  const torneo = await obtenerTorneo();
  const { equipos } = indices(torneo);
  if (torneo.zonas.length === 0) return <Vacio>Todavía no hay zonas cargadas.</Vacio>;
  const { clasificadosPorZona } = torneoConfig.formato;
  return (
    <>
      <div className="flex flex-col gap-4">
        {torneo.zonas.map((z) => (
          <TablaZona key={z.zona} zona={z} equipos={equipos} rachas={torneo.rachas} clasificados={clasificadosPorZona} />
        ))}
        {torneoConfig.formato.cruces === "general" && torneo.general.length > 1 && (
          <TablaGeneral filas={torneo.general} equipos={equipos} completa={torneo.zonas.every((z) => z.completa)} />
        )}
      </div>
      <div className="mt-4 space-y-1 text-xs text-texto-suave">
        <p className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border-l-4 border-marca bg-marca/10" />
          {clasificadosPorZona === 1 ? "El primero clasifica" : `Los ${clasificadosPorZona} primeros clasifican`} a la fase final.
        </p>
        <p>
          Victoria {torneoConfig.puntos.victoria} pts, empate {torneoConfig.puntos.empate}. Desempate en la zona:{" "}
          {torneoConfig.desempate.map((c) => NOMBRE_CRITERIO[c]).join(", ")}.
        </p>
        <p>Solo suman los partidos finalizados. La racha muestra los últimos 3 resultados.</p>
        <p>
          <Link href="/reglamento" className="font-semibold text-enlace underline underline-offset-2">
            Ver el reglamento completo
          </Link>
        </p>
      </div>
    </>
  );
}

export default function PaginaTablas() {
  return (
    <>
      <TituloPagina>Tablas</TituloPagina>
      <Suspense fallback={<EsqueletoLista filas={4} />}>
        <Tablas />
      </Suspense>
    </>
  );
}
