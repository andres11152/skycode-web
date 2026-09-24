import { describe, expect, it } from "vitest";
import { isLeadServiceSlug, isLeadFormContext, resolveLeadService } from "./leadServices";

describe("isLeadServiceSlug", () => {
  it("acepta los slugs reales del catálogo y 'otro'", () => {
    expect(isLeadServiceSlug("desarrollo-software-medida")).toBe(true);
    expect(isLeadServiceSlug("otro")).toBe(true);
  });

  it("rechaza cualquier string arbitrario", () => {
    expect(isLeadServiceSlug("cualquier-cosa")).toBe(false);
    expect(isLeadServiceSlug("")).toBe(false);
  });
});

describe("isLeadFormContext", () => {
  it("solo acepta la whitelist cerrada de orígenes", () => {
    expect(isLeadFormContext("Formulario Web")).toBe(true);
    expect(isLeadFormContext("Cotizador")).toBe(true);
    expect(isLeadFormContext("<script>")).toBe(false);
  });
});

describe("resolveLeadService", () => {
  it("devuelve la etiqueta canónica en español para un slug real", () => {
    expect(resolveLeadService("apis-integraciones")).toBe("Integraciones & Conexión de Sistemas");
  });

  it("incluye el servicio de Ecommerce en el catálogo", () => {
    expect(isLeadServiceSlug("ecommerce-tienda-online")).toBe(true);
    expect(resolveLeadService("ecommerce-tienda-online")).toBe("Ecommerce · Tienda en Línea");
  });

  it("devuelve 'Otro: <texto>' cuando el slug es 'otro' con texto libre", () => {
    expect(resolveLeadService("otro", "Consultoría de arquitectura")).toBe("Otro: Consultoría de arquitectura");
  });

  it("trunca el texto libre de 'otro' a 120 caracteres", () => {
    const longText = "a".repeat(200);
    const result = resolveLeadService("otro", longText);
    expect(result).toBe(`Otro: ${"a".repeat(120)}`);
  });

  it("devuelve null si es 'otro' sin texto (nunca inventa un servicio)", () => {
    expect(resolveLeadService("otro", "")).toBeNull();
    expect(resolveLeadService("otro", "   ")).toBeNull();
    expect(resolveLeadService("otro", null)).toBeNull();
  });

  it("devuelve null sin slug o con un slug inválido — nunca un default inventado", () => {
    expect(resolveLeadService(null)).toBeNull();
    expect(resolveLeadService(undefined)).toBeNull();
    expect(resolveLeadService("no-existe")).toBeNull();
  });
});
