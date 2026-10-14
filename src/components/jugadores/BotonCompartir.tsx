"use client";

import { useState } from "react";
import { IconoCompartir } from "@/components/ui/iconos";

/** Comparte el link de la página (WhatsApp, etc.). Si no se puede, lo copia. */
export function BotonCompartir({ titulo, texto }: { titulo: string; texto: string }) {
  const [copiado, setCopiado] = useState(false);

  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
      } catch {
        // El usuario cerró el menú de compartir.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copiá el link:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={compartir}
      className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-full bg-marca px-5 font-semibold text-marca-texto dark:bg-acento dark:text-acento-texto"
    >
      <IconoCompartir className="size-5" />
      <span aria-live="polite">{copiado ? "Link copiado" : "Compartir figurita"}</span>
    </button>
  );
}
