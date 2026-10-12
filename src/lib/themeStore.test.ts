import { afterEach, describe, expect, it, vi } from "vitest";
import { setThemePreference } from "./themeStore";

// Entorno de Node: se simula solo lo que `setThemePreference` toca del navegador.
function stubBrowser(visibility: "visible" | "hidden", startViewTransition?: ReturnType<typeof vi.fn>) {
  const attributes = new Map<string, string>();
  const root = {
    style: { setProperty: vi.fn(), removeProperty: vi.fn() },
    classList: { add: vi.fn(), remove: vi.fn() },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    hasAttribute: (name: string) => attributes.has(name),
  };
  vi.stubGlobal("document", { documentElement: root, visibilityState: visibility, startViewTransition });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    innerWidth: 1000,
    innerHeight: 800,
  });
  return { attributes, root };
}

afterEach(() => vi.unstubAllGlobals());

describe("setThemePreference y las transiciones de vista", () => {
  it("con la pestaña oculta aplica el tema sin iniciar una transición (el navegador la abortaría)", () => {
    const startViewTransition = vi.fn();
    const { attributes } = stubBrowser("hidden", startViewTransition);

    setThemePreference("dark", { x: 10, y: 10 });

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(attributes.get("data-theme")).toBe("dark");
  });

  it("si la transición se aborta (ready rechazada) no deja un rechazo sin manejar y limpia el estado", async () => {
    const ready = Promise.reject(new DOMException("Transition was aborted because of invalid state", "InvalidStateError"));
    const finished = Promise.resolve();
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return { ready, finished };
    });
    const { attributes, root } = stubBrowser("visible", startViewTransition);

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      setThemePreference("dark", { x: 10, y: 10 });
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(attributes.get("data-theme")).toBe("dark");
    expect(unhandled).toEqual([]);
    expect(root.classList.remove).toHaveBeenCalledWith("theme-switching");
  });
});
