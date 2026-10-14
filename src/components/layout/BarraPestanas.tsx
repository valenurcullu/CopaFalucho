"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { IconoEquipos, IconoFixture, IconoLlaves, IconoStats, IconoTablas } from "@/components/ui/iconos";

interface Pestania {
  href: string;
  titulo: string;
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  /** Otras rutas que también marcan esta pestaña como activa. */
  incluye?: string[];
}

const PESTANIAS: Pestania[] = [
  { href: "/", titulo: "Fixture", Icono: IconoFixture },
  { href: "/tablas", titulo: "Tablas", Icono: IconoTablas },
  { href: "/llaves", titulo: "Llaves", Icono: IconoLlaves },
  { href: "/estadisticas", titulo: "Stats", Icono: IconoStats },
  { href: "/equipos", titulo: "Equipos", Icono: IconoEquipos, incluye: ["/jugadores"] },
];

const estaActiva = (p: Pestania, ruta: string) =>
  p.href === "/" ? ruta === "/" : [p.href, ...(p.incluye ?? [])].some((r) => ruta === r || ruta.startsWith(`${r}/`));

export function BarraPestanas({ hayEnVivo = false }: { hayEnVivo?: boolean }) {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-superficie/85"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {PESTANIAS.map((p) => {
          const activa = estaActiva(p, ruta);
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                  activa ? "text-marca dark:text-acento" : "text-texto-suave"
                }`}
              >
                <span className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors ${activa ? "bg-marca/12 dark:bg-acento/15" : ""}`}>
                  <p.Icono className="size-[22px]" />
                  {p.href === "/" && hayEnVivo && (
                    <span className="absolute right-1.5 top-0 size-2.5 rounded-full bg-vivo ring-2 ring-superficie">
                      <span className="sr-only">Hay partidos en juego</span>
                    </span>
                  )}
                </span>
                {p.titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
