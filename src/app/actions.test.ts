import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const updateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath, updateTag }));

describe("actualizarTodo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T20:00:00Z"));
    vi.resetModules();
    revalidatePath.mockClear();
    updateTag.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("descarta la planilla y todas las pantallas", async () => {
    const { actualizarTodo } = await import("./actions");
    expect(await actualizarTodo()).toEqual({ omitido: false });
    expect(updateTag).toHaveBeenCalledWith("planilla");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("no repite la actualización si alguien la hizo hace menos de 15 segundos", async () => {
    const { actualizarTodo } = await import("./actions");
    await actualizarTodo();
    vi.advanceTimersByTime(10_000);
    expect(await actualizarTodo()).toEqual({ omitido: true });
    expect(updateTag).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6_000);
    expect(await actualizarTodo()).toEqual({ omitido: false });
    expect(updateTag).toHaveBeenCalledTimes(2);
  });
});
