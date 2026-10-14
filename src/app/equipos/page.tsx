import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EsqueletoLista, TituloPagina, Vacio } from "@/components/ui/basicos";
import { EscudoClase } from "@/components/ui/EscudoClase";
import { IconoFlecha } from "@/components/ui/iconos";
import { Racha } from "@/components/ui/Racha";
import { obtenerTorneo } from "@/lib/torneo";

export const metadata: Metadata = { title: "Equipos" };

async function ListaEquipos() {
  const torneo = await obtenerTorneo();
  if (torneo.equipos.length === 0) return <Vacio>Todavía no hay equipos cargados.</Vacio>;
  const posicion = new Map(torneo.zonas.flatMap((z) => z.tabla.map((f) => [f.equipoId, f.posicion] as const)));
  return (
    <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
      {torneo.equipos.map((e) => (
        <li key={e.id}>
          <Link href={`/equipos/${e.id}`} prefetch={false} className="flex min-h-16 items-center gap-3 rounded-2xl bg-superficie p-3 ring-1 ring-borde active:bg-superficie-alt">
            <EscudoClase equipo={e} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{e.nombre}</span>
              <span className="flex items-center gap-2 text-xs text-texto-suave">
                {e.zona && (
                  <span>
                    Zona {e.zona}
                    {posicion.has(e.id) && ` · ${posicion.get(e.id)}°`}
                  </span>
                )}
                <Racha resultados={torneo.rachas[e.id] ?? []} />
              </span>
            </span>
            <IconoFlecha className="size-4 text-texto-suave" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PaginaEquipos() {
  return (
    <>
      <TituloPagina bajada="Tocá una clase para ver su fixture y su plantel.">Equipos</TituloPagina>
      <Suspense fallback={<EsqueletoLista />}>
        <ListaEquipos />
      </Suspense>
    </>
  );
}
