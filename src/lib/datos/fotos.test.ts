import { describe, expect, it } from "vitest";
import type { Jugador } from "@/domain/tipos";
import { completarFotos } from "./fotos";

const jugador = (id: string, fotoDriveId: string | null): Jugador => ({
  id, equipoId: "2001", nombre: id, apodo: null, numero: null, posicion: null,
  fotoUrl: fotoDriveId ? `https://drive.google.com/thumbnail?id=${fotoDriveId}` : null,
  pesoKg: null, alturaCm: null, soloEnEventos: false, fotoDriveId,
});

describe("completarFotos", () => {
  it("usa la foto optimizada solo si es de la última foto que subió el jugador", () => {
    const [arreglada, nueva, sinArreglar, sinFoto] = completarFotos(
      [jugador("A", "f1"), jugador("B", "f3"), jugador("C", "f4"), jugador("D", null)],
      { A: "f1", B: "f2" },
    );
    expect(arreglada.fotoUrl).toBe("/jugadores/A.webp");
    expect(nueva.fotoUrl).toContain("drive.google.com"); // subió otra foto después de arreglar
    expect(sinArreglar.fotoUrl).toContain("drive.google.com");
    expect(sinFoto.fotoUrl).toBeNull();
  });
});
