import type { Metadata } from "next";
import Link from "next/link";
import { IconoSinSenal } from "@/components/ui/iconos";

export const metadata: Metadata = { title: "Sin conexión" };

/** Se muestra cuando no hay señal y la pantalla pedida nunca se abrió antes. */
export default function SinConexion() {
  return (
    <div className="py-16 text-center">
      <IconoSinSenal className="mx-auto size-14 text-texto-suave" />
      <h1 className="mt-4 font-titulos text-2xl font-bold uppercase">Sin conexión</h1>
      <p className="mx-auto mt-1 max-w-xs text-texto-suave">
        Esta pantalla todavía no se guardó en tu celular. Las que ya abriste se pueden ver sin señal.
      </p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-marca px-5 font-semibold text-marca-texto">
        Ir al fixture
      </Link>
    </div>
  );
}
