import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import landingEs from "./locales/es/landing.json";
import { LANDING_VARIANT_IDS, getLandingContent, getLandingMetadata, landingPath } from "./landing";
import { PRICING } from "./projectEstimator";
import { getTestimonialsContent } from "./testimonials";
import { LEAD_SERVICE_SLUGS } from "@/lib/leadServices";

const PORTFOLIO_SLUGS = (
  JSON.parse(readFileSync(join(process.cwd(), "scripts/seed-data/portfolio/es.json"), "utf8")) as { items: { slug: string }[] }
).items.map((item) => item.slug);

const allCopy: string[] = [];
(function collect(value: unknown) {
  if (typeof value === "string") allCopy.push(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === "object") Object.values(value).forEach(collect);
})(landingEs);

describe("landing de campaña", () => {
  it.each(LANDING_VARIANT_IDS)("la variante %s tiene todo lo que la página necesita", (id) => {
    const { variant } = getLandingContent(id);
    expect(variant.title.length).toBeGreaterThan(10);
    expect(variant.intro.length).toBeGreaterThan(30);
    // El formulario preselecciona un servicio que existe (o ninguno).
    expect(variant.defaultService === "" || (LEAD_SERVICE_SLUGS as readonly string[]).includes(variant.defaultService)).toBe(true);
    for (const slug of variant.caseSlugs) expect(PORTFOLIO_SLUGS).toContain(slug);
    const companies = getTestimonialsContent("es").testimonials.map((t) => t.company);
    for (const company of variant.testimonialCompanies) expect(companies).toContain(company);
    expect(variant.whatsappMessage.length).toBeGreaterThan(10);
  });

  it("el título y la descripción de cada variante respetan los límites de buscador", () => {
    for (const id of LANDING_VARIANT_IDS) {
      const { title, description } = getLandingMetadata(id) as { title: string; description: string };
      // El layout agrega " | SkyCode" (10 caracteres).
      expect(title.length).toBeLessThanOrEqual(50);
      expect(description.length).toBeLessThanOrEqual(155);
    }
  });

  it("las rutas de las variantes son las que sirve la app y no se indexan", () => {
    expect(landingPath("general")).toBe("/landing");
    expect(landingPath("precio")).toBe("/landing/precio");
    for (const id of LANDING_VARIANT_IDS) {
      expect(getLandingMetadata(id).robots).toEqual({ index: false, follow: false });
    }
  });

  it("los precios y plazos salen de PRICING, nunca del JSON", () => {
    const { pricingRows, facts } = getLandingContent("general");
    expect(pricingRows).toHaveLength(landingEs.pricing.rows.length);
    for (const row of pricingRows) {
      expect(PRICING[row.id]).toBeDefined();
      expect(row.weeks).toBe(PRICING[row.id].baseWeeks);
      expect(row.price).toMatch(/^\$[\d.,]+ M COP$/);
    }
    // Ninguna cifra de dinero escrita a mano en el copy.
    expect(allCopy.filter((text) => /\$\s?\d/.test(text))).toEqual([]);
    expect(facts.items[0].value).toMatch(/^\$[\d.,]+ M COP$/);
  });

  it("promete 4 horas hábiles de respuesta y no deja la promesa de 24 horas", () => {
    expect(allCopy.some((text) => text.includes("4 horas hábiles"))).toBe(true);
    expect(allCopy.filter((text) => /24 ?h/i.test(text))).toEqual([]);
  });

  it("no usa signos de exclamación ni afirma un NIT que no existe", () => {
    expect(allCopy.filter((text) => /[!¡]/.test(text))).toEqual([]);
    expect(allCopy.filter((text) => /\bNIT\b/.test(text))).toEqual([]);
    expect(landingEs.footer.responsible).toContain("RUT");
  });

  it("el formulario ofrece como máximo 7 opciones y solo servicios del catálogo", () => {
    expect(landingEs.form.typeOptions.length).toBeLessThanOrEqual(7);
    for (const option of landingEs.form.typeOptions) {
      expect(option.service === "" || (LEAD_SERVICE_SLUGS as readonly string[]).includes(option.service)).toBe(true);
    }
  });
});
