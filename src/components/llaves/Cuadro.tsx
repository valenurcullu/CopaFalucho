import Link from "next/link";
import { EnVivo } from "@/components/ui/basicos";
import { EscudoClase } from "@/components/ui/EscudoClase";
import type { Equipo, Fase } from "@/domain/tipos";
import { formatearDiaCorto } from "@/lib/formato";
import { NOMBRE_FASE } from "@/lib/torneo/llaves";
import type { PartidoTarjeta } from "@/lib/torneo/vista";

export interface CruceCuadro {
  id: string;
  fase: Fase;
  nombre: string;
  partido: PartidoTarjeta | null;
  local: Equipo | null;
  visitante: Equipo | null;
  etiquetaLocal: string;
  etiquetaVisitante: string;
}

function Lado({ equipo, etiqueta, goles, penales, gana, pierde }: { equipo: Equipo | null; etiqueta: string; goles: number | null; penales: number | null; gana: boolean; pierde: boolean }) {
  return (
    <div className={`flex min-h-11 items-center gap-2 px-3 ${pierde ? "opacity-55" : ""}`}>
      <EscudoClase equipo={equipo} tamanio="sm" />
      {equipo ? (
        <Link href={`/equipos/${equipo.id}`} className={`min-w-0 flex-1 truncate text-sm ${gana ? "font-bold" : "font-medium"}`}>
          {equipo.nombre}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm italic text-texto-suave">{etiqueta}</span>
      )}
      {penales !== null && <span className="text-[11px] text-texto-suave">({penales})</span>}
      <span className={`w-5 text-right font-titulos text-xl tabular-nums ${gana ? "font-extrabold" : "font-semibold"}`}>{goles ?? ""}</span>
    </div>
  );
}

function TarjetaCruce({ cruce }: { cruce: CruceCuadro }) {
  const p = cruce.partido;
  const ganador = p?.ganadorId ?? null;
  const enJuego = p?.estado === "en_juego";
  return (
    <article
      aria-label={cruce.nombre}
      className={`w-60 overflow-hidden rounded-xl bg-superficie ring-1 ${enJuego ? "ring-2 ring-vivo" : "ring-borde"}`}
    >
      <div className="flex items-center justify-between border-b border-borde px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-suave">
        <span>{cruce.nombre}</span>
        {enJuego ? (
          <EnVivo />
        ) : p?.estado === "finalizado" ? (
          <span>Final</span>
        ) : (
          <span>{p ? `${formatearDiaCorto(p.fecha)}${p.hora ? ` · ${p.hora}` : ""}` : "A programar"}</span>
        )}
      </div>
      <Lado
        equipo={cruce.local}
        etiqueta={cruce.etiquetaLocal}
        goles={p?.marcador?.local ?? null}
        penales={p?.penales?.local ?? null}
        gana={!!ganador && ganador === cruce.local?.id}
        pierde={!!ganador && ganador !== cruce.local?.id}
      />
      <Lado
        equipo={cruce.visitante}
        etiqueta={cruce.etiquetaVisitante}
        goles={p?.marcador?.visitante ?? null}
        penales={p?.penales?.visitante ?? null}
        gana={!!ganador && ganador === cruce.visitante?.id}
        pierde={!!ganador && ganador !== cruce.visitante?.id}
      />
    </article>
  );
}

/**
 * Cuadro de fase final: una columna por fase, con scroll horizontal.
 * Cada columna reparte sus cruces en la misma altura, así quedan alineados
 * con los de la fase siguiente.
 */
export function Cuadro({ cruces, campeon }: { cruces: CruceCuadro[]; campeon: Equipo | null }) {
  const fases = [...new Set(cruces.map((c) => c.fase))].filter((f) => f !== "tercer_puesto");
  const tercerPuesto = cruces.filter((c) => c.fase === "tercer_puesto");
  const alto = Math.max(...fases.map((f) => cruces.filter((c) => c.fase === f).length)) * 132;

  return (
    <div className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]" tabIndex={0} aria-label="Cuadro de fase final, deslizá para ver todas las fases">
      <div className="flex w-max gap-4">
        {fases.map((fase) => (
          <section key={fase} aria-label={NOMBRE_FASE[fase]} className="flex snap-start flex-col">
            <h2 className="mb-2 font-titulos text-lg font-bold uppercase tracking-wide text-texto-suave">{NOMBRE_FASE[fase]}</h2>
            <div className="flex flex-col justify-around gap-3" style={{ minHeight: alto }}>
              {cruces
                .filter((c) => c.fase === fase)
                .map((c) => (
                  <TarjetaCruce key={c.id} cruce={c} />
                ))}
            </div>
          </section>
        ))}
        <section aria-label="Campeón" className="flex snap-start flex-col">
          <h2 className="mb-2 font-titulos text-lg font-bold uppercase tracking-wide text-texto-suave">Campeón</h2>
          <div className="flex flex-1 flex-col justify-around gap-3">
            <div className="grid w-48 place-items-center gap-2 rounded-xl bg-marca p-4 text-center text-marca-texto ring-2 ring-acento">
              <span aria-hidden="true" className="text-3xl">🏆</span>
              {campeon ? (
                <>
                  <EscudoClase equipo={campeon} tamanio="md" />
                  <Link href={`/equipos/${campeon.id}`} className="font-titulos text-xl font-extrabold uppercase">
                    {campeon.nombre}
                  </Link>
                </>
              ) : (
                <span className="text-sm opacity-85">A definir</span>
              )}
            </div>
            {tercerPuesto.map((c) => (
              <div key={c.id}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-suave">{NOMBRE_FASE.tercer_puesto}</h3>
                <TarjetaCruce cruce={c} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
