import { Suspense } from "react";
import { AvisoFormato } from "@/components/layout/AvisoFormato";
import { Fixture } from "@/components/partidos/Fixture";
import { EsqueletoLista } from "@/components/ui/basicos";
import { torneoConfig } from "@/config/torneo";
import { obtenerTorneo } from "@/lib/torneo";
import { aTarjeta, indices } from "@/lib/torneo/vista";

async function FixtureConDatos() {
  const torneo = await obtenerTorneo();
  const { equipos, jugadores } = indices(torneo);
  return (
    <>
      <AvisoFormato torneo={torneo} />
      <Fixture
        partidos={torneo.partidos.map((p) => aTarjeta(p, equipos, jugadores))}
        equipos={torneo.equipos}
        zonas={torneo.zonas.map((z) => z.zona)}
        conFichas={torneoConfig.jugadores.mostrarFichas}
      />
    </>
  );
}

export default function PaginaFixture() {
  return (
    <>
      <h1 className="sr-only">Fixture</h1>
      <Suspense fallback={<EsqueletoLista />}>
        <FixtureConDatos />
      </Suspense>
    </>
  );
}
