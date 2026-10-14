import Image from "next/image";
import type { Equipo } from "@/domain/tipos";
import { digitosClase } from "@/lib/formato";

const TAMANIOS = { sm: "size-7 text-xs", md: "size-10 text-base", lg: "size-16 text-2xl" } as const;
const PIXELES = { sm: 28, md: 40, lg: 64 } as const;

/**
 * Escudo de una clase. Si en la planilla hay escudo_url se usa la imagen;
 * si no, un distintivo con los dos dígitos del año ("'01").
 */
export function EscudoClase({ equipo, tamanio = "md" }: { equipo: Equipo | null | undefined; tamanio?: keyof typeof TAMANIOS }) {
  if (equipo?.escudoUrl) {
    return (
      <Image
        src={equipo.escudoUrl}
        alt=""
        width={PIXELES[tamanio]}
        height={PIXELES[tamanio]}
        unoptimized={equipo.escudoUrl.startsWith("http")}
        className={`${TAMANIOS[tamanio]} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${TAMANIOS[tamanio]} grid shrink-0 place-items-center rounded-full font-titulos font-extrabold leading-none ${
        equipo ? "bg-marca text-acento ring-2 ring-acento/70" : "border-2 border-dashed border-borde text-texto-suave"
      }`}
    >
      {equipo ? `’${digitosClase(equipo.anio)}` : "?"}
    </span>
  );
}
