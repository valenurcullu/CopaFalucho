import Image from "next/image";

/** Silueta para cuando el jugador no tiene foto. */
function Silueta() {
  return (
    <svg viewBox="0 0 120 150" className="size-full text-white/25" aria-hidden="true">
      <circle cx="60" cy="52" r="26" fill="currentColor" />
      <path d="M12 150c4-34 24-52 48-52s44 18 48 52Z" fill="currentColor" />
    </svg>
  );
}

export function FotoJugador({ src, nombre, prioridad = false, tamanios = "(max-width: 512px) 90vw, 420px" }: { src: string | null; nombre: string; prioridad?: boolean; tamanios?: string }) {
  if (!src) {
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
      unoptimized={src.startsWith("http")}
      className="object-cover object-top"
    />
  );
}
