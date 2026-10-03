import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyText", () => {
  it("usa navigator.clipboard cuando está disponible", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    expect(await copyText("hola")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("devuelve false (sin lanzar) si el portapapeles rechaza y no hay DOM de respaldo", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });

    expect(await copyText("hola")).toBe(false);
  });

  it("devuelve false si no hay portapapeles ni documento", async () => {
    vi.stubGlobal("navigator", {});

    expect(await copyText("hola")).toBe(false);
  });
});
