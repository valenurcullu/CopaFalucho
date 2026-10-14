import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { torneoConfig } from "./torneo";

describe("configuración", () => {
  it("la revalidación de las páginas coincide con la de los datos", () => {
    // `revalidate` en el layout tiene que ser un literal, así que no puede importar la config.
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    const literal = Number(/export const revalidate = (\d+);/.exec(layout)?.[1]);
    expect(literal).toBe(torneoConfig.revalidarSegundos);
  });
});
