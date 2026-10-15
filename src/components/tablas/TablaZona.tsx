import Link from "next/link";
import { Tarjeta } from "@/components/ui/basicos";
import { EscudoClase } from "@/components/ui/EscudoClase";
import { Racha } from "@/components/ui/Racha";
import type { Equipo } from "@/domain/tipos";
import type { Resultado, ZonaVista } from "@/lib/torneo";

interface Props {
  zona: ZonaVista;
  equipos: Map<string, Equipo>;
  rachas: Record<string, Resultado[]>;
  clasificados: number;
}

const COLUMNAS = [
  ["PJ", "Partidos jugados"],
  ["G", "Ganados"],
  ["E", "Empatados"],
  ["P", "Perdidos"],
  ["DG", "Diferencia de gol"],
] as const;

export function TablaZona({ zona, equipos, rachas, clasificados }: Props) {
  return (
    <Tarjeta as="section" className="overflow-hidden">
      <div className="flex items-center justify-between bg-secundario px-4 py-2 text-secundario-texto">
        <h2 className="font-titulos text-xl font-bold uppercase tracking-wide">Zona {zona.zona}</h2>
        <span className="text-xs opacity-85">{zona.completa ? "Terminada" : "En curso"}</span>
      </div>
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Posiciones de la zona {zona.zona}</caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-texto-suave">
            <th scope="col" className="w-8 py-2 pl-3 text-left font-semibold">
              <abbr className="no-underline" title="Posición">#</abbr>
            </th>
            <th scope="col" className="py-2 text-left font-semibold">
              Equipo
            </th>
            {COLUMNAS.map(([c, titulo]) => (
              <th key={c} scope="col" className="w-7 py-2 text-center font-semibold">
                <abbr className="no-underline" title={titulo}>{c}</abbr>
              </th>
            ))}
            <th scope="col" className="w-10 py-2 pr-3 text-center font-bold text-texto">
              <abbr className="no-underline" title="Puntos">Pts</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {zona.tabla.map((f) => {
            const equipo = equipos.get(f.equipoId);
            const clasifica = f.posicion <= clasificados;
            return (
              <tr key={f.equipoId} className={`border-t border-borde ${clasifica ? "bg-marca/8" : ""}`}>
                <td className={`py-2 pl-3 font-titulos text-lg font-bold ${clasifica ? "border-l-4 border-marca pl-2 text-marca" : ""}`}>
                  {f.posicion}
                  {zona.completa && f.empateSinResolver && (
                    <abbr title="Empate sin resolver con los criterios configurados" className="ml-0.5 text-xs text-derrota no-underline">
                      =
                    </abbr>
                  )}
                </td>
                <th scope="row" className="py-1.5 text-left font-normal">
                  <Link href={`/equipos/${f.equipoId}`} prefetch={false} className="flex min-h-11 items-center gap-2">
                    <EscudoClase equipo={equipo} tamanio="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{equipo?.nombre ?? f.equipoId}</span>
                      <span className="flex items-center gap-1.5">
                        <Racha resultados={rachas[f.equipoId] ?? []} />
                        {zona.completa && clasifica && <span className="text-[10px] font-bold uppercase tracking-wide text-marca">Clasificado</span>}
                      </span>
                    </span>
                  </Link>
                </th>
                <td className="text-center">{f.pj}</td>
                <td className="text-center">{f.pg}</td>
                <td className="text-center">{f.pe}</td>
                <td className="text-center">{f.pp}</td>
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
