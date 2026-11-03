"use client";

import { useEffect, useState } from "react";

/**
 * Hora actual, actualizada cada `cadaMs`. Es null hasta que el componente se
 * monta en el celular, para que el servidor y el cliente dibujen lo mismo.
 */
export function useAhora(cadaMs = 30_000): Date | null {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    const tic = () => setAhora(new Date());
    const primero = setTimeout(tic, 0);
    const id = setInterval(tic, cadaMs);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, [cadaMs]);
  return ahora;
}
