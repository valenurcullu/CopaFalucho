"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IconoActualizar } from "@/components/ui/iconos";
import { haceCuanto } from "@/lib/formato";

/**
 * "Actualizado hace X" + botón para volver a pedir los datos al servidor.
 * El texto se recalcula cada 30 segundos.
 */
export function EstadoDatos({ actualizadoEn }: { actualizadoEn: string }) {
  const router = useRouter();
  const [actualizando, iniciar] = useTransition();
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    const tic = () => setAhora(new Date());
    tic();
    const id = setInterval(tic, 30_000);
    return () => clearInterval(id);
  }, []);

  const texto = ahora ? haceCuanto(new Date(actualizadoEn), ahora) : "";

  return (
    <button
      type="button"
      onClick={() => iniciar(() => router.refresh())}
      className="-mr-2 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium opacity-90 hover:bg-white/10"
      aria-label={`Actualizar datos. Última actualización: ${texto || "recién"}`}
    >
      <span aria-live="polite" className="tabular-nums">
        {actualizando ? "Actualizando…" : texto && `Actualizado ${texto}`}
      </span>
      <IconoActualizar className={`size-5 ${actualizando ? "animate-spin" : ""}`} />
    </button>
  );
}
