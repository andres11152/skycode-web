import { describe, expect, it } from "vitest";
import { getFaqContent, getFaqPageContent } from "@/content/faq";
import { services } from "@/content/services";
import { parseInlineLinks, stripInlineLinks } from "@/lib/inlineLinks";
import { faqPath } from "@/lib/faqPaths";
import { locales } from "@/lib/i18n";

// El catálogo del FAQ es contenido que se publica en 3 idiomas y cuyas
// preguntas son URLs (`#id`): estas pruebas evitan que un idioma se
// desincronice, que un `id` cambie sin querer o que una respuesta cuele un
// enlace roto/externo.

const idsOf = (locale: (typeof locales)[number]) => getFaqPageContent(locale).items.map((item) => item.id);
const serviceSlugs = new Set(services.map((service) => service.slug));

describe("catálogo del FAQ", () => {
  it("los tres idiomas tienen las mismas preguntas, en el mismo orden", () => {
    const [base, ...others] = locales.map(idsOf);
    for (const ids of others) expect(ids).toEqual(base);
  });

  it("los temas coinciden entre idiomas y ninguno está vacío", () => {
    const ids = (l: (typeof locales)[number]) => getFaqPageContent(l).categories.map((c) => c.id);
    for (const locale of locales) {
      expect(ids(locale)).toEqual(ids("es"));
      for (const category of getFaqPageContent(locale).categories) expect(category.items.length).toBeGreaterThan(0);
    }
  });

  it("los id son únicos y seguros como ancla de URL", () => {
    for (const locale of locales) {
      const ids = idsOf(locale);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("ninguna pregunta ni respuesta está vacía", () => {
    for (const locale of locales) {
      for (const item of getFaqPageContent(locale).items) {
        expect(item.question.trim().length).toBeGreaterThan(10);
        expect(item.answer.trim().length).toBeGreaterThan(40);
      }
    }
  });
});

describe("enlaces internos en las respuestas", () => {
  it("todos son rutas internas y no queda sintaxis de enlace sin procesar", () => {
    for (const locale of locales) {
      for (const item of getFaqPageContent(locale).items) {
        for (const segment of parseInlineLinks(item.answer)) {
          if (segment.type === "link") {
            expect(segment.href.startsWith("/")).toBe(true);
            expect(segment.href.startsWith("//")).toBe(false);
          }
        }
        // Si algún `[texto](url)` fuera inválido (ej. https:), `parseInlineLinks` lo deja
        // literal y quedaría "](" en el texto visible: eso es un enlace roto.
        expect(stripInlineLinks(item.answer)).not.toContain("](");
      }
    }
  });

  it("los enlaces a servicios apuntan a un servicio que existe", () => {
    for (const locale of locales) {
      for (const item of getFaqPageContent(locale).items) {
        for (const segment of parseInlineLinks(item.answer)) {
          if (segment.type !== "link") continue;
          const match = segment.href.match(/\/servicios\/([a-z0-9-]+)$/);
          if (match) expect(serviceSlugs.has(match[1])).toBe(true);
        }
      }
    }
  });
});

describe("FAQ de la home", () => {
  it("cada idioma resuelve sus destacadas del catálogo (sin perder ninguna)", () => {
    for (const locale of locales) {
      const home = getFaqContent(locale);
      expect(home.items).toHaveLength(6);
      expect(home.totalCount).toBe(getFaqPageContent(locale).items.length);
      const catalog = new Set(idsOf(locale));
      for (const item of home.items) expect(catalog.has(item.id)).toBe(true);
    }
  });
});

describe("SEO de la página", () => {
  it("el <title> final (con el sufijo del layout) no pasa de 60 caracteres", () => {
    for (const locale of locales) {
      expect(getFaqPageContent(locale).meta.title.length + " | SkyCode Agency".length).toBeLessThanOrEqual(60);
    }
  });

  it("la meta description cabe en un snippet (≤ 170)", () => {
    for (const locale of locales) {
      expect(getFaqPageContent(locale).meta.description.length).toBeLessThanOrEqual(170);
    }
  });

  it("faqPath traduce el slug por idioma", () => {
    expect(faqPath("es")).toBe("/preguntas-frecuentes");
    expect(faqPath("en")).toBe("/en/faq");
    expect(faqPath("fr")).toBe("/fr/faq");
  });
});
