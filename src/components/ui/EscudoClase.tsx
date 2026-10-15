import Image from "next/image";
import type { Equipo } from "@/domain/tipos";

const TAMANIOS = { sm: "size-7 text-[11px]", md: "size-10 text-sm", lg: "size-16 text-2xl" } as const;
const PIXELES = { sm: 28, md: 40, lg: 64 } as const;

/**
 * Escudo de una clase. Si en la planilla hay escudo_url se usa la imagen;
 * si no, un distintivo con la sigla ("’01", "80+", "RDM").
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
        equipo ? "bg-marca text-marca-texto ring-2 ring-marca-clara" : "border-2 border-dashed border-borde text-texto-suave"
      }`}
    >
      {equipo ? equipo.sigla : "?"}
    </span>
  );
}
