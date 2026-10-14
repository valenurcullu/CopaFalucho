import { marca, type ColoresTema } from "@/config/marca";

const aKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function declaraciones(colores: ColoresTema): string {
  return Object.entries(colores)
    .map(([nombre, valor]) => `--c-${aKebab(nombre)}:${valor};`)
    .join("");
}

/**
 * CSS con las variables de color de la marca. Se inyecta en el <head> para
 * que globals.css y Tailwind lean de un único origen (config/marca.ts).
 */
export function cssVariablesTema(): string {
  const { claro, oscuro } = marca.colores;
  return [
    `:root{color-scheme:light dark;${declaraciones(claro)}}`,
    `@media (prefers-color-scheme: dark){:root{${declaraciones(oscuro)}}}`,
  ].join("");
}
