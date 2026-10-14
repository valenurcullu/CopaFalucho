import Link from "next/link";
import { EnVivo, Insignia } from "@/components/ui/basicos";
import { EscudoClase } from "@/components/ui/EscudoClase";
import { IconoPelota, Tarjeta } from "@/components/ui/iconos";
import type { Equipo } from "@/domain/tipos";
import type { EventoVista, PartidoTarjeta } from "@/lib/torneo/vista";

interface Props {
  partido: PartidoTarjeta;
  /** Si es false, los nombres de jugadores no llevan a la ficha. */
  conFichas: boolean;
  /** Muestra la fecha del partido en la cabecera (para listas sin agrupar por día). */
  mostrarFecha?: string;
}

function etiquetaFase(p: PartidoTarjeta) {
  if (p.fase === "zona") return `Zona ${p.zona}${p.fechaNro ? ` · Fecha ${p.fechaNro}` : ""}`;
  return p.nombreLlave ?? p.fase;
}

function FilaEquipo({ equipo, etiqueta, goles, gana, penales }: { equipo: Equipo | null; etiqueta: string | null; goles: number | null; gana: boolean; penales: number | null }) {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <EscudoClase equipo={equipo} tamanio="sm" />
      {equipo ? (
        <Link href={`/equipos/${equipo.id}`} className={`min-w-0 flex-1 truncate text-[15px] ${gana ? "font-bold" : "font-medium"}`}>
          {equipo.nombre}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[15px] italic text-texto-suave">{etiqueta ?? "A definir"}</span>
      )}
      {penales !== null && <span className="text-xs font-semibold tabular-nums text-texto-suave">({penales})</span>}
      <span className={`w-7 text-right font-titulos text-2xl leading-none tabular-nums ${gana ? "font-extrabold" : "font-semibold"}`}>
        {goles ?? ""}
      </span>
    </div>
  );
}

function LineaEvento({ evento, conFichas }: { evento: EventoVista; conFichas: boolean }) {
  const nombre = evento.jugador ?? "Sin dato";
  const icono =
    evento.tipo === "gol" || evento.tipo === "gol_en_contra" ? (
      <IconoPelota className={evento.tipo === "gol_en_contra" ? "text-derrota" : "text-texto"} />
    ) : (
      <Tarjeta tipo={evento.tipo} />
    );
  const contenido = (
    <>
      {nombre}
      {evento.tipo === "gol_en_contra" && <span className="text-texto-suave"> (e/c)</span>}
    </>
  );
  const derecha = evento.lado === "visitante";
  return (
    <li className={`flex items-center gap-1.5 ${derecha ? "flex-row-reverse text-right" : ""}`}>
      {icono}
      <span className="w-6 shrink-0 tabular-nums text-texto-suave">{evento.minuto !== null ? `${evento.minuto}’` : ""}</span>
      {conFichas && evento.jugadorId && evento.jugador ? (
        <Link href={`/jugadores/${evento.jugadorId}`} className="min-w-0 truncate underline-offset-2 hover:underline">
          {contenido}
        </Link>
      ) : (
        <span className="min-w-0 truncate">{contenido}</span>
      )}
    </li>
  );
}

export function TarjetaPartido({ partido: p, conFichas, mostrarFecha }: Props) {
  const enJuego = p.estado === "en_juego";
  const finalizado = p.estado === "finalizado";
  const eventosLocal = p.eventos.filter((e) => e.lado === "local");
  const eventosVisitante = p.eventos.filter((e) => e.lado === "visitante");

  return (
    <article
      aria-label={`${p.local?.nombre ?? p.etiquetaLocal ?? "A definir"} contra ${p.visitante?.nombre ?? p.etiquetaVisitante ?? "A definir"}`}
      className={`rounded-2xl bg-superficie p-4 ring-1 ${enJuego ? "ring-2 ring-vivo" : "ring-borde"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-texto-suave">
          {mostrarFecha && <>{mostrarFecha} · </>}
          {etiquetaFase(p)}
        </span>
        {enJuego ? <EnVivo /> : finalizado ? <Insignia>Final</Insignia> : <Insignia className="bg-acento/25 text-texto">{p.hora ?? "A conf."}</Insignia>}
      </div>

      <div className="flex flex-col gap-1">
        <FilaEquipo equipo={p.local} etiqueta={p.etiquetaLocal} goles={p.marcador?.local ?? null} gana={!!p.ganadorId && p.ganadorId === p.local?.id} penales={p.penales?.local ?? null} />
        <FilaEquipo equipo={p.visitante} etiqueta={p.etiquetaVisitante} goles={p.marcador?.visitante ?? null} gana={!!p.ganadorId && p.ganadorId === p.visitante?.id} penales={p.penales?.visitante ?? null} />
      </div>
      {p.penales && finalizado && (
        <p className="mt-1 text-right text-xs text-texto-suave">
          Definido por penales {p.penales.local}-{p.penales.visitante}
        </p>
      )}

      {p.eventos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 border-t border-borde pt-3 text-[13px]">
          <ul className="flex min-w-0 flex-col gap-1" aria-label={`Eventos de ${p.local?.nombre ?? "local"}`}>
            {eventosLocal.map((e) => (
              <LineaEvento key={e.id} evento={e} conFichas={conFichas} />
            ))}
          </ul>
          <ul className="flex min-w-0 flex-col gap-1" aria-label={`Eventos de ${p.visitante?.nombre ?? "visitante"}`}>
            {eventosVisitante.map((e) => (
              <LineaEvento key={e.id} evento={e} conFichas={conFichas} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-borde pt-2 text-xs text-texto-suave">
        {p.cancha && <span>{p.cancha}</span>}
        {p.hora && <span>{p.hora} h</span>}
        {p.arbitro && <span>Árbitro: {p.arbitro}</span>}
      </p>
    </article>
  );
}
