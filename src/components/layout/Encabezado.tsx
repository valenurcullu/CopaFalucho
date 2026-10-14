import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { marca } from "@/config/marca";
import { torneoConfig } from "@/config/torneo";

export function Encabezado({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-marca text-marca-texto pt-safe dark:border-b dark:border-borde dark:bg-fondo/95 dark:backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-safe">
        <Link href="/" className="-ml-1 flex min-h-11 items-center gap-2.5 rounded-lg pr-2" aria-label={`${marca.nombreTorneo}, inicio`}>
          <Image src={marca.logo.src} alt="" width={26} height={40} priority className="h-10 w-auto drop-shadow" />
          <span className="leading-none">
            <span className="block font-titulos text-xl font-extrabold uppercase tracking-wide">{marca.nombreTorneo}</span>
            <span className="block text-[11px] font-medium opacity-80">
              {marca.club} · {torneoConfig.edicion}
            </span>
          </span>
        </Link>
        <div className="ml-auto">{children}</div>
      </div>
    </header>
  );
}
