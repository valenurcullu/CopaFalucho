import { describe, expect, it } from "vitest";
import { completarFotos } from "../../src/lib/datos/fotos";
import { validarImportacion } from "./validar";

const CSV = `id,equipo,nombre,número,posición,peso_kg,altura_cm
2001-01,2001,Juan Pérez,1,Arquero,"82,5",184
2001-02,2001,Pedro Gómez,9,Delantero,75,178
2001-03,2001,Luis Díaz,9,Defensor,,180
2001-04,2001,,4,Defensor,80,180
2001-02,2001,Repetido,5,Defensor,80,180
2002-01,2002,Ana Ríos,10,Mediocampista,300,170
`;

describe("validarImportacion", () => {
  const r = validarImportacion(CSV, ["2001-01.JPG", "2001-02.png", "2009-01.jpg", "notas.txt", ".DS_Store", "2001-01.png"]);
  const mensajes = r.problemas.map((p) => `${p.nivel} ${p.donde}: ${p.mensaje}`);

  it("acepta las filas válidas y normaliza decimales", () => {
    expect(r.jugadores.map((j) => j.id)).toEqual(["2001-01", "2001-02", "2001-03"]);
    expect(r.jugadores[0].peso_kg).toBe(82.5);
  });

  it("rechaza filas sin nombre, ids repetidos y valores imposibles", () => {
    expect(mensajes).toContainEqual(expect.stringMatching(/^error fila 5: Falta el nombre/));
    expect(mensajes).toContainEqual(expect.stringMatching(/^error fila 6: El id 2001-02 está repetido/));
    expect(mensajes).toContainEqual(expect.stringMatching(/^error fila 7: El peso parece mal cargado/));
  });

  it("advierte números repetidos y datos faltantes", () => {
    expect(mensajes).toContainEqual(expect.stringMatching(/número 9 ya lo tiene Pedro Gómez/));
    expect(mensajes).toContainEqual(expect.stringMatching(/Luis Díaz le falta el peso o la altura/));
  });

  it("asocia fotos por id sin importar mayúsculas ni extensión", () => {
    expect([...r.fotos]).toEqual([
      ["2001-01", "2001-01.JPG"],
      ["2001-02", "2001-02.png"],
    ]);
    expect(mensajes).toContainEqual(expect.stringMatching(/2009-01.jpg: No se encontró al jugador/));
    expect(mensajes).toContainEqual(expect.stringMatching(/notas.txt: Formato de imagen no soportado/));
    expect(mensajes).toContainEqual(expect.stringMatching(/más de una foto para 2001-01/));
    expect(mensajes.some((m) => m.includes(".DS_Store"))).toBe(false);
  });

  it("frena si faltan columnas obligatorias", () => {
    const sinNombre = validarImportacion("id,equipo\n2001-01,2001\n", []);
    expect(sinNombre.jugadores).toEqual([]);
    expect(sinNombre.problemas[0].mensaje).toContain('"nombre"');
  });
});

describe("fotos nombradas por equipo y nombre", () => {
  const csv = `id,equipo,nombre,apodo
2001-01,2001,Juan Pérez,Coke
2001-02,2001,Martín Monclús,
2002-01,2002,Juan Gómez,
`;
  it("encuentra al jugador por apodo, nombre completo o apellido", () => {
    const r = validarImportacion(csv, ["2001 - Coke.jpg", "01 Martin Monclus.png", "2002 gomez.jpg", "2001 Nadie.jpg"]);
    expect([...r.fotos]).toEqual([
      ["2001-01", "2001 - Coke.jpg"],
      ["2001-02", "01 Martin Monclus.png"],
      ["2002-01", "2002 gomez.jpg"],
    ]);
    expect(r.problemas.filter((p) => !p.donde.startsWith("fila")).map((p) => p.donde)).toEqual(["2001 Nadie.jpg"]);
  });
});

describe("completarFotos", () => {
  const jugador = (id: string, fotoUrl: string | null) => ({
    id, equipoId: "2001", nombre: id, apodo: null, numero: null, posicion: null, fotoUrl, pesoKg: null, alturaCm: null, soloEnEventos: false, fotoDriveId: null,
  });

  it("usa la foto importada si la planilla no trae foto_url", () => {
    const [a, b, c] = completarFotos([jugador("A", null), jugador("B", "https://x/b.jpg"), jugador("C", null)], { A: null, B: null });
    expect(a.fotoUrl).toBe("/jugadores/A.webp");
    expect(b.fotoUrl).toBe("https://x/b.jpg");
    expect(c.fotoUrl).toBeNull();
  });

  it("con foto del formulario, usa la optimizada solo si es de esa misma foto", () => {
    const delForm = { ...jugador("A", "https://drive.google.com/thumbnail?id=nueva"), fotoDriveId: "nueva" };
    expect(completarFotos([delForm], { A: "vieja" })[0].fotoUrl).toContain("drive.google.com");
    expect(completarFotos([delForm], { A: "nueva" })[0].fotoUrl).toBe("/jugadores/A.webp");
  });
});
