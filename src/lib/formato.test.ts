import { describe, expect, it } from "vitest";
import { formatearDia, formatearDiaCorto, haceCuanto } from "./formato";

describe("formato", () => {
  it("formatea días sin correrse por la zona horaria", () => {
    expect(formatearDia("2026-11-28")).toBe("Sábado 28 de noviembre");
    expect(formatearDiaCorto("2026-12-06")).toBe("dom 6/12");
    expect(formatearDia(null)).toBe("Fecha a confirmar");
  });

  it("dice hace cuánto se actualizó", () => {
    const ahora = new Date("2026-12-05T12:00:00Z");
    expect(haceCuanto(new Date("2026-12-05T11:59:40Z"), ahora)).toBe("recién");
    expect(haceCuanto(new Date("2026-12-05T11:57:00Z"), ahora)).toBe("hace 3 min");
    expect(haceCuanto(new Date("2026-12-05T10:00:00Z"), ahora)).toBe("hace 2 h");
    expect(haceCuanto(new Date("2026-12-04T11:00:00Z"), ahora)).toBe("hace 1 día");
  });
});
