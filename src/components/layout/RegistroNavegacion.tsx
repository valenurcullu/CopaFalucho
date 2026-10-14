"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { registrarPantalla } from "@/lib/navegacion";

/** Registra cada cambio de pantalla (ver lib/navegacion). No dibuja nada. */
export function RegistroNavegacion() {
  const ruta = usePathname();
  useEffect(registrarPantalla, [ruta]);
  return null;
}
