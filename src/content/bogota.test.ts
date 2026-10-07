import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BogotaView } from "@/components/bogota/BogotaView";
import { rawBogotaContent } from "@/content/bogota";
import { getServiceBySlug } from "@/content/services";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { stripInlineLinks, parseInlineLinks } from "@/lib/inlineLinks";
import { hasTodo, TODO_MARKER } from "@/lib/todoPlaceholders";

// Claves cuyo valor NO es texto visible (rutas, ids, metadatos). Todo lo demás se cuenta.
const NON_VISIBLE_KEYS = new Set(["meta", "slug", "id", "tocLabel", "aria"]);
const MIN_WORDS = 1200;

/** Recorre el contenido y devuelve cada cadena visible, saltando los elementos con marcador TODO. */
function collectVisibleStrings(value: unknown, key = ""): string[] {
  if (NON_VISIBLE_KEYS.has(key)) return [];
  if (typeof value === "string") return [stripInlineLinks(value)];
  if (Array.isArray(value)) {
    return value.filter((item) => !hasTodo(item)).flatMap((item) => collectVisibleStrings(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([childKey, child]) => collectVisibleStrings(child, childKey));
  }
  return [];
}

function countWords(strings: string[]): number {
  return strings.join(" ").split(/\s+/).filter(Boolean).length;
}

/** Todas las cadenas del contenido, a cualquier profundidad, con su ruta (para ubicar marcadores). */
function walk(value: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${path}[${index}]`, out));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key, out);
  }
}

describe("contenido de /desarrollo-software-bogota", () => {
  it("la ruta es la constante compartida", () => {
    expect(bogotaPagePath).toBe("/desarrollo-software-bogota");
  });

  it("título ≤ 50 caracteres (sin sufijo) y descripción ≤ 155", () => {
    expect(rawBogotaContent.meta.title.length).toBeLessThanOrEqual(50);
    expect(rawBogotaContent.meta.description.length).toBeLessThanOrEqual(155);
    expect(rawBogotaContent.meta.description.length).toBeGreaterThan(80);
    expect(hasTodo(rawBogotaContent.meta)).toBe(false);
  });

  it("tiene al menos 1.200 palabras visibles sin contar los elementos con marcador TODO", () => {
    const words = countWords(collectVisibleStrings(rawBogotaContent));
    expect(words).toBeGreaterThanOrEqual(MIN_WORDS);
  });

  it("los marcadores TODO solo viven en filas de precios/tiempos y preguntas, cada uno en su propio elemento", () => {
    const strings: { path: string; text: string }[] = [];
    walk(rawBogotaContent, "", strings);
    const withMarker = strings.filter((entry) => entry.text.includes(TODO_MARKER));
    expect(withMarker.length).toBeGreaterThan(0);
    for (const entry of withMarker) {
      expect(entry.path).toMatch(/^(pricing\.rows\[\d+\]\.value|timelines\.rows\[\d+\]\.value|faq\.items\[\d+\]\.answer)$/);
      // El valor es SOLO el marcador (no va mezclado con una frase que sí debe publicarse).
      expect(entry.text).toMatch(/^\{\{TODO: [^}]+\}\}$/);
    }
  });

  it("los marcadores siguen el formato exigido (rango de precio en COP / tiempo típico)", () => {
    const strings: { path: string; text: string }[] = [];
    walk(rawBogotaContent, "", strings);
    for (const entry of strings.filter((item) => item.text.includes(TODO_MARKER))) {
      expect(entry.text).toMatch(/^\{\{TODO: (rango de precio en COP de|tiempo típico de) .+\}\}$/);
    }
  });

  it("los enlaces internos de servicios y casos apuntan a páginas que existen", () => {
    const known = [
      "sentry-crm",
      "servifuturo",
      "equilibrio-arquitectonico",
      "cda-revifull",
      "racingbike",
    ];
    expect(rawBogotaContent.cases.items.map((item) => item.slug)).toEqual(known);

    const allServices = [
      "desarrollo-software-medida",
      "desarrollo-aplicaciones-moviles",
      "apis-integraciones",
      "frontend-alto-rendimiento",
      "ecommerce-tienda-online",
      "seguridad-cumplimiento",
      "arquitectura-documentacion",
      "migracion-datos-legacy",
      "inteligencia-artificial-aplicada",
    ];
    // Enlaza a las 9 páginas de servicio, sin repetir ni inventar una.
    expect(rawBogotaContent.services.items.map((item) => item.slug)).toEqual(allServices);
    for (const slug of allServices) expect(getServiceBySlug(slug, "es")).toBeDefined();

    // Los enlaces dentro del texto (`[texto](/ruta)`) son solo rutas internas conocidas.
    const strings: { path: string; text: string }[] = [];
    walk(rawBogotaContent, "", strings);
    const allowedPrefixes = [/^\/servicios(\/[a-z0-9-]+)?$/, /^\/blog\/[a-z0-9-]+$/, /^\/cotizador$/, /^\/#contacto$/, /^\/portafolio(\/[a-z0-9-]+)?$/];
    for (const entry of strings) {
      for (const segment of parseInlineLinks(entry.text)) {
        if (segment.type !== "link") continue;
        expect(allowedPrefixes.some((pattern) => pattern.test(segment.href)), `${entry.path}: ${segment.href}`).toBe(true);
        const serviceMatch = /^\/servicios\/([a-z0-9-]+)$/.exec(segment.href);
        if (serviceMatch) expect(allServices).toContain(serviceMatch[1]);
      }
    }
  });

  it("los ids de sección y de pregunta son únicos y seguros como ancla", () => {
    const ids = [
      rawBogotaContent.about.id,
      rawBogotaContent.services.id,
      rawBogotaContent.cases.id,
      rawBogotaContent.process.id,
      rawBogotaContent.compliance.id,
      rawBogotaContent.pricing.id,
      rawBogotaContent.timelines.id,
      rawBogotaContent.faq.id,
      ...rawBogotaContent.faq.items.map((item) => item.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("la FAQ real (sin marcadores) tiene entre 6 y 8 preguntas", () => {
    const real = rawBogotaContent.faq.items.filter((item) => !hasTodo(item));
    expect(real.length).toBeGreaterThanOrEqual(6);
    expect(rawBogotaContent.faq.items.length).toBeLessThanOrEqual(8);
  });
});

describe("render de /desarrollo-software-bogota", () => {
  // `getBogotaContent()` decide con NODE_ENV; en producción se omiten los marcadores.
  function render(): string {
    return renderToStaticMarkup(createElement(BogotaView));
  }

  it("emite exactamente un H1 y todas las secciones con ancla", () => {
    const html = render();
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    for (const id of ["que-hacemos", "servicios", "casos", "proceso", "ley-1581", "precios", "tiempos"]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("enlaza a los 9 servicios y a los 5 casos del portafolio", () => {
    const html = render();
    for (const item of rawBogotaContent.services.items) expect(html).toContain(`href="/servicios/${item.slug}"`);
    for (const item of rawBogotaContent.cases.items) expect(html).toContain(`href="/portafolio/${item.slug}"`);
    expect(html).toContain('href="/#contacto"');
    expect(html).toContain("https://wa.me/");
  });

  it("no muestra marcadores TODO en producción y sigue sobrepasando las 1.200 palabras", () => {
    const original = process.env.NODE_ENV;
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "production";
    delete env.NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS;
    try {
      const html = render();
      expect(html).not.toContain(TODO_MARKER);
      const text = html
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z#0-9]+;/g, " ");
      const words = text.split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(MIN_WORDS);
    } finally {
      env.NODE_ENV = original;
    }
  });
});
