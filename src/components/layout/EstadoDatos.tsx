"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IconoActualizar, IconoSinSenal } from "@/components/ui/iconos";
import { useConexion } from "@/hooks/useConexion";
import { haceCuanto } from "@/lib/formato";

/**
 * "Actualizado hace X" + botón para volver a pedir los datos. Sin señal,
 * avisa que lo que se ve es la última versión guardada.
 */
export function EstadoDatos({ actualizadoEn }: { actualizadoEn: string }) {
  const router = useRouter();
  const conectado = useConexion();
  const [actualizando, iniciar] = useTransition();
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    const tic = () => setAhora(new Date());
    const primero = setTimeout(tic, 0);
    const id = setInterval(tic, 30_000);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, []);

  const hace = ahora ? haceCuanto(new Date(actualizadoEn), ahora) : "";

  if (!conectado) {
    return (
      <span role="status" className="flex min-h-11 items-center gap-1.5 rounded-full bg-white/12 px-3 text-xs font-semibold">
        <IconoSinSenal className="size-4" />
        Sin señal{hace && ` · datos ${hace}`}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => iniciar(() => router.refresh())}
      className="-mr-2 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium opacity-90 hover:bg-white/10"
      aria-label={`Actualizar datos. Última actualización: ${hace || "recién"}`}
    >
      <span aria-live="polite" className="tabular-nums">
        {actualizando ? "Actualizando…" : hace && `Actualizado ${hace}`}
      </span>
      <IconoActualizar className={`size-5 ${actualizando ? "animate-spin" : ""}`} />
    </button>
  );
}
