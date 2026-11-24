import { describe, expect, it } from "vitest";
import { calcularRecorte, caraPrincipal, estaDerecha, girosParaEnderezar, PROPORCION } from "./recorte";

const proporcion = (r: { width: number; height: number }) => r.width / r.height;

describe("calcularRecorte", () => {
  it("centra la cara de lado a lado y un poco arriba del medio", () => {
    // Foto 1600x1200, cara de 200x240 en el medio.
    const r = calcularRecorte(1600, 1200, { x: 700, y: 400, ancho: 200, alto: 240 });
    expect(proporcion(r)).toBeCloseTo(PROPORCION, 1);
    expect(r.left + r.width / 2).toBeCloseTo(800, -1); // centro de la cara
    const centroCaraEnRecorte = (520 - r.top) / r.height;
    expect(centroCaraEnRecorte).toBeCloseTo(0.4, 1);
  });

  it("no se sale de la foto cuando la cara está en un borde", () => {
    const r = calcularRecorte(1600, 1200, { x: 20, y: 10, ancho: 200, alto: 240 });
    expect(r.left).toBe(0);
    expect(r.top).toBe(0);
    const abajoDerecha = calcularRecorte(1600, 1200, { x: 1400, y: 950, ancho: 200, alto: 240 });
    expect(abajoDerecha.left + abajoDerecha.width).toBeLessThanOrEqual(1600);
    expect(abajoDerecha.top + abajoDerecha.height).toBeLessThanOrEqual(1200);
  });

  it("si la cara es enorme, usa la foto entera en 4:5", () => {
    const r = calcularRecorte(1200, 1600, { x: 200, y: 300, ancho: 800, alto: 900 });
    expect(r.top + r.height).toBeLessThanOrEqual(1600);
    expect(r.left + r.width).toBeLessThanOrEqual(1200);
    expect(proporcion(r)).toBeCloseTo(PROPORCION, 1);
    expect(r.height).toBe(1500); // 1200 de ancho en 4:5
  });

  it("en una foto horizontal el recorte vertical ocupa todo el alto si hace falta", () => {
    const r = calcularRecorte(1600, 900, { x: 700, y: 200, ancho: 300, alto: 360 });
    expect(r.height).toBeLessThanOrEqual(900);
    expect(proporcion(r)).toBeCloseTo(PROPORCION, 1);
  });
});

describe("caraPrincipal", () => {
  it("elige la cara más grande", () => {
    const chica = { x: 0, y: 0, ancho: 50, alto: 60 };
    const grande = { x: 300, y: 100, ancho: 200, alto: 240 };
    expect(caraPrincipal([chica, grande])).toBe(grande);
    expect(caraPrincipal([])).toBeNull();
  });
});

describe("girosParaEnderezar", () => {
  it("no toca las fotos con la cara casi derecha", () => {
    expect(girosParaEnderezar(0)).toEqual([]);
    expect(girosParaEnderezar(0.3)).toEqual([]);
    expect(girosParaEnderezar(-0.5)).toEqual([]);
  });

  it("prueba los dos sentidos cuando la cara está acostada", () => {
    expect(girosParaEnderezar(Math.PI / 2).sort((a, b) => a - b)).toEqual([90, 270]);
    expect(girosParaEnderezar(-Math.PI / 2).sort((a, b) => a - b)).toEqual([90, 270]);
  });

  it("una cara cabeza abajo se gira 180°", () => {
    expect(girosParaEnderezar(Math.PI)).toEqual([180]);
  });

  it("reconoce una cara derecha", () => {
    expect(estaDerecha({ x: 0, y: 0, ancho: 1, alto: 1, roll: 0.1 })).toBe(true);
    expect(estaDerecha({ x: 0, y: 0, ancho: 1, alto: 1, roll: 1.5 })).toBe(false);
  });
});

