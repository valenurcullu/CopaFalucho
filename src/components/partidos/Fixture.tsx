"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Vacio } from "@/components/ui/basicos";
import type { Equipo } from "@/domain/tipos";
import { formatearDia, hoyEnBuenosAires } from "@/lib/formato";
import type { PartidoTarjeta } from "@/lib/torneo/vista";
import { TarjetaPartido } from "./TarjetaPartido";

const FASE_FINAL = "final";

interface Props {
  partidos: PartidoTarjeta[];
  equipos: Equipo[];
  zonas: string[];
  conFichas: boolean;
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
        activo ? "bg-marca text-marca-texto dark:bg-acento dark:text-acento-texto" : "bg-superficie text-texto ring-1 ring-borde"
      }`}
    >
      {children}
    </button>
  );
}

export function Fixture({ partidos, equipos, zonas, conFichas }: Props) {
  const [zona, setZona] = useState<string | null>(null);
  const [equipoId, setEquipoId] = useState("");
  const yaDesplazo = useRef(false);

  const filtrados = useMemo(
    () =>
      partidos.filter((p) => {
        if (zona === FASE_FINAL && p.fase === "zona") return false;
        if (zona && zona !== FASE_FINAL && p.zona !== zona) return false;
        if (equipoId && p.local?.id !== equipoId && p.visitante?.id !== equipoId) return false;
        return true;
      }),
    [partidos, zona, equipoId],
  );

  const porDia = useMemo(() => {
    const grupos = new Map<string, PartidoTarjeta[]>();
    for (const p of filtrados) {
      const clave = p.fecha ?? "sin-fecha";
      grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
    }
    return [...grupos];
  }, [filtrados]);

  const enJuego = partidos.filter((p) => p.estado === "en_juego");

  // Al abrir, salta al día de hoy (o al próximo con partidos) si no hay nada en juego.
  useEffect(() => {
    if (yaDesplazo.current || enJuego.length > 0) return;
    yaDesplazo.current = true;
    const hoy = hoyEnBuenosAires();
    const destino = porDia.find(([fecha]) => fecha !== "sin-fecha" && fecha >= hoy)?.[0];
    if (destino && destino !== porDia[0][0]) {
      document.getElementById(`dia-${destino}`)?.scrollIntoView({ block: "start" });
    }
  }, [porDia, enJuego.length]);

  return (
    <div>
      {enJuego.length > 0 && (
        <section aria-labelledby="titulo-en-juego" className="mb-6">
          <h2 id="titulo-en-juego" className="mb-2 flex items-center gap-2 font-titulos text-xl font-bold uppercase tracking-wide">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-vivo opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-vivo" />
            </span>
            Ahora en la cancha
          </h2>
          <div className="flex flex-col gap-3">
            {enJuego.map((p) => (
              <TarjetaPartido key={p.id} partido={p} conFichas={conFichas} />
            ))}
          </div>
        </section>
      )}

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mb-3 bg-fondo/95 px-4 py-2 backdrop-blur">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtrar por zona">
          <Chip activo={zona === null} onClick={() => setZona(null)}>
            Todos
          </Chip>
          {zonas.map((z) => (
            <Chip key={z} activo={zona === z} onClick={() => setZona(z)}>
              Zona {z}
            </Chip>
          ))}
          <Chip activo={zona === FASE_FINAL} onClick={() => setZona(FASE_FINAL)}>
            Fase final
          </Chip>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <span className="sr-only">Filtrar por equipo</span>
          <select
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            className="min-h-11 w-full rounded-xl bg-superficie px-3 ring-1 ring-borde"
          >
            <option value="">Todos los equipos</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {porDia.length === 0 && <Vacio>No hay partidos con estos filtros.</Vacio>}

      {porDia.map(([fecha, lista]) => (
        <section key={fecha} id={`dia-${fecha}`} aria-labelledby={`titulo-${fecha}`} className="mb-6 scroll-mt-40">
          <h2 id={`titulo-${fecha}`} className="mb-2 font-titulos text-lg font-bold uppercase tracking-wide text-texto-suave">
            {fecha === "sin-fecha" ? "Fecha a confirmar" : formatearDia(fecha)}
          </h2>
          <div className="flex flex-col gap-3">
            {lista.map((p) => (
              <TarjetaPartido key={p.id} partido={p} conFichas={conFichas} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
