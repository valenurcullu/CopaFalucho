import Link from "next/link";
import { Tarjeta } from "@/components/ui/basicos";
import { EscudoClase } from "@/components/ui/EscudoClase";
import type { Equipo } from "@/domain/tipos";
import type { FilaGeneral } from "@/lib/torneo/tablas";

/**
 * Clasificados de todas las zonas ordenados entre sí. Define los cruces:
 * 1º contra el último, 2º contra el anteúltimo, etc.
 */
export function TablaGeneral({ filas, equipos, completa }: { filas: FilaGeneral[]; equipos: Map<string, Equipo>; completa: boolean }) {
  const total = filas.length;
  return (
    <Tarjeta as="section" className="overflow-hidden">
      <div className="flex items-center justify-between bg-marca px-4 py-2 text-marca-texto">
        <h2 className="font-titulos text-xl font-bold uppercase tracking-wide">Tabla general</h2>
        <span className="text-xs opacity-85">{completa ? "Cruces definidos" : "Provisoria"}</span>
      </div>
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Clasificados de todas las zonas ordenados para armar los cruces</caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-texto-suave">
            <th scope="col" className="w-8 py-2 pl-3 text-left font-semibold">#</th>
            <th scope="col" className="py-2 text-left font-semibold">Equipo</th>
            <th scope="col" className="w-12 py-2 text-center font-semibold">Zona</th>
            <th scope="col" className="w-9 py-2 text-center font-semibold"><abbr className="no-underline" title="Diferencia de gol">DG</abbr></th>
            <th scope="col" className="w-10 py-2 pr-3 text-center font-bold text-texto"><abbr className="no-underline" title="Puntos">Pts</abbr></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const equipo = equipos.get(f.equipoId);
            return (
              <tr key={f.equipoId} className="border-t border-borde">
                <td className="py-2 pl-3 font-titulos text-lg font-bold text-marca">{f.posicion}</td>
                <th scope="row" className="py-1 text-left font-normal">
                  <Link href={`/equipos/${f.equipoId}`} prefetch={false} className="flex min-h-11 items-center gap-2">
                    <EscudoClase equipo={equipo} tamanio="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{equipo?.nombre ?? f.equipoId}</span>
                      <span className="block text-xs text-texto-suave">vs. {total + 1 - f.posicion}º de la general</span>
                    </span>
                  </Link>
                </th>
                <td className="text-center text-texto-suave">{f.puestoZona}º {f.zona}</td>
                <td className="text-center">{f.dg > 0 ? `+${f.dg}` : f.dg}</td>
                <td className="pr-3 text-center font-titulos text-lg font-extrabold">{f.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Tarjeta>
  );
}
