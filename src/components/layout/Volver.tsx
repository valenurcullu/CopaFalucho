"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconoVolver } from "@/components/ui/iconos";
import { hayPantallaAnterior } from "@/lib/navegacion";

/**
 * Vuelve a la pantalla anterior si se llegó navegando dentro de la app; si se
 * abrió el link directo, lleva a `alternativa`.
 */
export function Volver({ alternativa, texto = "Volver" }: { alternativa: string; texto?: string }) {
  const router = useRouter();
  return (
    <Link
      href={alternativa}
      onClick={(e) => {
        if (hayPantallaAnterior()) {
          e.preventDefault();
          router.back();
        }
      }}
      className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg pr-3 text-sm font-semibold text-texto-suave"
    >
      <IconoVolver className="size-5" />
      {texto}
    </Link>
  );
}
