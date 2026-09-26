import { describe, expect, it } from "vitest";
import { getSimpleIcon, searchSimpleIcons } from "./simpleIcons";

describe("getSimpleIcon", () => {
  it("resuelve un ícono real del paquete instalado, con path/viewBox/hex", () => {
    const icon = getSimpleIcon("nextdotjs");
    expect(icon).not.toBeNull();
    expect(icon!.title).toBe("Next.js");
    expect(icon!.viewBox).toBe("0 0 24 24");
    expect(icon!.pathD.length).toBeGreaterThan(10);
    expect(icon!.hex).toMatch(/^[0-9A-Fa-f]{6}$/);
  });

  it("resuelve otra marca real (PostgreSQL) para confirmar que no está hardcodeado a un solo slug", () => {
    const icon = getSimpleIcon("postgresql");
    expect(icon).not.toBeNull();
    expect(icon!.title).toBe("PostgreSQL");
  });

  it("devuelve null para un slug que no existe, sin lanzar", () => {
    expect(getSimpleIcon("esta-marca-no-existe-jamas-xyz")).toBeNull();
  });

  it("sanea el slug: rechaza cualquier intento de path traversal antes de tocar el filesystem", () => {
    expect(getSimpleIcon("../../../etc/passwd")).toBeNull();
    expect(getSimpleIcon("nextdotjs/../../../etc/passwd")).toBeNull();
    expect(getSimpleIcon("Nextdotjs")).toBeNull(); // mayúsculas tampoco — el catálogo siempre guarda el slug en minúsculas
  });

  it("cachea el resultado — llamadas repetidas no vuelven a leer el archivo cada vez", () => {
    const first = getSimpleIcon("react");
    const second = getSimpleIcon("react");
    expect(first).toEqual(second);
    // Mismo objeto de referencia (cache hit), no una copia nueva.
    expect(first).toBe(second);
  });
});

describe("searchSimpleIcons", () => {
  it("encuentra por coincidencia parcial de slug", () => {
    const results = searchSimpleIcons("nextdot");
    expect(results.some((r) => r.slug === "nextdotjs")).toBe(true);
  });

  it("encuentra por coincidencia parcial de título, sin distinguir mayúsculas", () => {
    const results = searchSimpleIcons("postgre");
    expect(results.some((r) => r.slug === "postgresql")).toBe(true);
  });

  it("respeta el límite pedido", () => {
    const results = searchSimpleIcons("a", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("una búsqueda vacía no devuelve las +3400 marcas, devuelve vacío", () => {
    expect(searchSimpleIcons("")).toEqual([]);
    expect(searchSimpleIcons("   ")).toEqual([]);
  });

  it("una búsqueda sin coincidencias devuelve vacío", () => {
    expect(searchSimpleIcons("zzzznoexisteestamarcaenabsoluto")).toEqual([]);
  });
});
