"use client";

import Image from "next/image";
import { useState } from "react";

/** Silueta para cuando el jugador no tiene foto (o no se pudo cargar). */
function Silueta() {
  return (
    <svg viewBox="0 0 120 150" className="size-full text-white/25" aria-hidden="true">
      <circle cx="60" cy="52" r="26" fill="currentColor" />
      <path d="M12 150c4-34 24-52 48-52s44 18 48 52Z" fill="currentColor" />
    </svg>
  );
}

/** Las fotos de Drive y las locales pasan por el optimizador de Next; otros links se muestran tal cual. */
const seOptimiza = (src: string) => src.startsWith("/") || src.startsWith("https://lh3.googleusercontent.com/d/");

export function FotoJugador({
  src,
  nombre,
  prioridad = false,
  tamanios = "(max-width: 512px) 90vw, 420px",
}: {
  src: string | null;
  nombre: string;
  prioridad?: boolean;
  tamanios?: string;
}) {
  const [fallo, setFallo] = useState<string | null>(null);
  if (!src || fallo === src) {
    return (
      <div role="img" aria-label={`${nombre} (sin foto)`} className="size-full">
        <Silueta />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={`Foto de ${nombre}`}
      fill
      sizes={tamanios}
      priority={prioridad}
      unoptimized={!seOptimiza(src)}
      onError={() => setFallo(src)}
      className="object-cover object-top"
    />
  );
}
