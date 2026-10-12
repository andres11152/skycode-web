import { describe, expect, it } from "vitest";
import { switchLocalePath } from "@/lib/localePaths";

describe("switchLocalePath", () => {
  it("la home va a la home del otro idioma", () => {
    expect(switchLocalePath("/", "en")).toBe("/en");
    expect(switchLocalePath("/en", "fr")).toBe("/fr");
    expect(switchLocalePath("/fr", "es")).toBe("/");
  });

  it("portafolio: traduce el slug del índice y conserva el del caso", () => {
    expect(switchLocalePath("/portafolio", "en")).toBe("/en/portfolio");
    expect(switchLocalePath("/en/portfolio", "fr")).toBe("/fr/portfolio");
    expect(switchLocalePath("/fr/portfolio", "es")).toBe("/portafolio");
    expect(switchLocalePath("/portafolio/sentry-crm", "fr")).toBe("/fr/portfolio/sentry-crm");
    expect(switchLocalePath("/en/portfolio/sentry-crm", "es")).toBe("/portafolio/sentry-crm");
  });

  it("FAQ: traduce el slug en ambos sentidos", () => {
    expect(switchLocalePath("/preguntas-frecuentes", "en")).toBe("/en/faq");
    expect(switchLocalePath("/en/faq", "fr")).toBe("/fr/faq");
    expect(switchLocalePath("/fr/faq", "es")).toBe("/preguntas-frecuentes");
  });

  it("servicios: el segmento y el slug de cada servicio se traducen en todos los sentidos", () => {
    expect(switchLocalePath("/servicios", "en")).toBe("/en/services");
    expect(switchLocalePath("/servicios", "fr")).toBe("/fr/services");
    expect(switchLocalePath("/en/services", "es")).toBe("/servicios");
    expect(switchLocalePath("/servicios/migracion-datos-legacy", "en")).toBe("/en/services/legacy-software-migration");
    expect(switchLocalePath("/servicios/migracion-datos-legacy", "fr")).toBe("/fr/services/migration-systemes-legacy");
    expect(switchLocalePath("/en/services/legacy-software-migration", "fr")).toBe("/fr/services/migration-systemes-legacy");
    expect(switchLocalePath("/fr/services/migration-systemes-legacy", "es")).toBe("/servicios/migracion-datos-legacy");
    expect(switchLocalePath("/fr/services/migration-systemes-legacy", "en")).toBe("/en/services/legacy-software-migration");
  });

  it("servicios: una ruta histórica o un slug desconocido caen al índice o se entienden", () => {
    expect(switchLocalePath("/en/servicios/apis-integraciones", "es")).toBe("/servicios/apis-integraciones");
    expect(switchLocalePath("/en/services/no-existe", "es")).toBe("/servicios");
  });

  it("equipo y cotizador conservan la sub-ruta con el prefijo del idioma", () => {
    expect(switchLocalePath("/en/equipo", "fr")).toBe("/fr/equipo");
    expect(switchLocalePath("/cotizador", "en")).toBe("/en/cotizador");
  });

  it("blog: el índice se conserva; un artículo conocido va a su versión y uno desconocido al índice", () => {
    expect(switchLocalePath("/blog", "en")).toBe("/en/blog");
    expect(switchLocalePath("/blog/migracion-sistemas-legados-sin-interrupcion", "en")).toBe("/en/blog/legacy-system-migration-without-downtime");
    expect(switchLocalePath("/en/blog/legacy-system-migration-without-downtime", "fr")).toBe("/fr/blog/migration-systeme-legacy-sans-interruption");
    expect(switchLocalePath("/fr/blog/migration-systeme-legacy-sans-interruption", "es")).toBe("/blog/migracion-sistemas-legados-sin-interrupcion");
    // Un post sin slug propio por idioma puede no estar traducido: al índice.
    expect(switchLocalePath("/en/blog/mi-post", "es")).toBe("/blog");
  });

  it("páginas sin versión por idioma (legales, gracias) caen a la home del idioma elegido", () => {
    expect(switchLocalePath("/politica-privacidad", "en")).toBe("/en");
    expect(switchLocalePath("/terminos-de-uso", "fr")).toBe("/fr");
  });

  it("ignora barra final, query y hash", () => {
    expect(switchLocalePath("/portafolio/", "en")).toBe("/en/portfolio");
    expect(switchLocalePath("/en/faq?q=pago#garantia", "es")).toBe("/preguntas-frecuentes");
  });

  it("un prefijo de idioma desconocido no se interpreta como idioma", () => {
    expect(switchLocalePath("/de/portafolio", "en")).toBe("/en");
  });
});
