import { describe, expect, it } from "vitest";
import { getServiceDetails } from "@/content/serviceDetails";
import { getServicePageContent } from "@/content/servicePage";
import { services } from "@/content/services";
import { parseInlineLinks } from "@/lib/inlineLinks";
import { locales } from "@/lib/i18n";
import { hasTodo } from "@/lib/todoPlaceholders";

// La sección "Desarrollo de X en Colombia" es contenido SEO que se publica en
// 3 idiomas × 9 servicios. Estas pruebas evitan que falte en algún idioma,
// que un párrafo se copie entre servicios (contenido duplicado) o que se
// salga del rango de 150–250 palabras que el plan de SEO exige.

const TODO_PATTERN = /\{\{TODO[^}]*\}\}/g;
const wordCount = (texts: string[]) => texts.join(" ").replace(TODO_PATTERN, "").split(/\s+/).filter(Boolean).length;

describe("sección «Desarrollo de X en Colombia» de cada servicio", () => {
  for (const locale of locales) {
    describe(locale, () => {
      for (const { slug } of services) {
        const colombia = getServiceDetails(slug, locale)?.colombia;

        it(`${slug}: existe, con encabezado que nombra el país`, () => {
          expect(colombia).toBeDefined();
          expect(colombia?.heading).toMatch(/Colombi/);
          expect(colombia?.paragraphs.length).toBeGreaterThan(0);
        });

        it(`${slug}: 150–250 palabras (sin contar marcadores)`, () => {
          if (!colombia) return;
          // Producción: se omiten las viñetas con marcador, queda solo el texto real.
          expect(wordCount(colombia.paragraphs)).toBeGreaterThanOrEqual(150);
          // Desarrollo: párrafos + viñetas (sin el marcador en sí).
          expect(wordCount([...colombia.paragraphs, ...colombia.facts])).toBeLessThanOrEqual(250);
        });

        it(`${slug}: los marcadores TODO viven solo en las viñetas, uno por viñeta`, () => {
          if (!colombia) return;
          expect(hasTodo(colombia.paragraphs)).toBe(false);
          expect(colombia.facts).toHaveLength(2);
          expect(colombia.facts[0]).toMatch(/\{\{TODO: rango de precio en COP de .+\}\}/);
          expect(colombia.facts[1]).toMatch(/\{\{TODO: tiempo típico de .+\}\}/);
        });

        it(`${slug}: solo enlaces internos válidos`, () => {
          if (!colombia) return;
          for (const text of colombia.paragraphs) {
            for (const segment of parseInlineLinks(text)) {
              if (segment.type === "link") expect(segment.href.startsWith("/")).toBe(true);
            }
          }
        });
      }

      it("ningún párrafo se repite entre servicios", () => {
        const paragraphs = services.flatMap(({ slug }) => getServiceDetails(slug, locale)?.colombia?.paragraphs ?? []);
        expect(new Set(paragraphs).size).toBe(paragraphs.length);
      });
    });
  }

  it("el encabezado de casos reales usa la redacción acordada", () => {
    expect(getServicePageContent("es").detail.casesHeading).toBe("Casos donde lo aplicamos");
    expect(getServicePageContent("en").detail.casesHeading).toBe("Case studies where we applied it");
    expect(getServicePageContent("fr").detail.casesHeading).toBe("Cas où nous l'avons appliqué");
  });
});
