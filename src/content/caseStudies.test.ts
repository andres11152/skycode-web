import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countCaseWords, parseCaseText } from "@/content/portfolioShared";

// Protege el JSON de datos de `npm run db:seo-case-studies`: los 5 casos en
// los 3 idiomas, con los mismos campos, sin inventar nada que parezca un dato
// verificado donde debe haber un marcador `{{TODO}}`, y con la extensión
// mínima que justificó el trabajo de SEO.

interface CaseLocale {
  clientContext: string;
  challenge: string;
  solution: string;
  architecture: string;
  process: string;
  results: string;
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialRole: string;
}
interface CaseEntry {
  es: CaseLocale;
  en: CaseLocale;
  fr: CaseLocale;
  alt: Record<"es" | "en" | "fr", string[]>;
  previous?: Record<string, Record<string, string>>;
}

const data = JSON.parse(readFileSync(join(process.cwd(), "scripts/seed-data/seo/case-studies.json"), "utf-8")) as {
  projects: Record<string, CaseEntry>;
};
const SLUGS = ["sentry-crm", "servifuturo", "equilibrio-arquitectonico", "cda-revifull", "racingbike"];
const LOCALES = ["es", "en", "fr"] as const;
const CHAPTERS = ["clientContext", "challenge", "solution", "architecture", "process", "results"] as const;
// Imágenes de cada caso en la base (orden de la galería original).
const IMAGE_COUNT: Record<string, number> = { "sentry-crm": 19, servifuturo: 14, "equilibrio-arquitectonico": 6, "cda-revifull": 5, racingbike: 6 };

describe("scripts/seed-data/seo/case-studies.json", () => {
  it("trae los 5 casos y solo esos", () => {
    expect(Object.keys(data.projects).sort()).toEqual([...SLUGS].sort());
  });

  for (const slug of SLUGS) {
    describe(slug, () => {
      for (const locale of LOCALES) {
        it(`${locale}: todos los capítulos con contenido y entre 700 y 1.100 palabras visibles`, () => {
          const entry = data.projects[slug][locale];
          for (const chapter of CHAPTERS) expect(parseCaseText(entry[chapter]).length, `${chapter} vacío`).toBeGreaterThan(0);
          const words = CHAPTERS.reduce((total, chapter) => total + countCaseWords(entry[chapter]), 0);
          expect(words).toBeGreaterThanOrEqual(700);
          expect(words).toBeLessThanOrEqual(1100);
        });

        it(`${locale}: cada marcador {{TODO}} ocupa su propio párrafo o viñeta (nunca en mitad de una frase real)`, () => {
          const entry = data.projects[slug][locale];
          for (const chapter of CHAPTERS) {
            for (const block of parseCaseText(entry[chapter])) {
              const chunks = block.type === "list" ? block.items : [block.text];
              for (const chunk of chunks) {
                if (!chunk.includes("{{TODO")) continue;
                expect(chunk.startsWith("{{TODO:") && chunk.endsWith("}}"), `${slug}/${locale}/${chapter}: ${chunk}`).toBe(true);
                expect(chunk.match(/\{\{TODO/g)).toHaveLength(1);
              }
            }
          }
        });

        it(`${locale}: el testimonio son tres campos, cada uno solo un marcador (no se inventa cita, autor ni cargo)`, () => {
          const entry = data.projects[slug][locale];
          for (const field of ["testimonialQuote", "testimonialAuthor", "testimonialRole"] as const) {
            expect(entry[field]).toMatch(/^\{\{TODO: [^{}]+\}\}$/);
          }
        });

        it(`${locale}: resultados y plazos reales pendientes están marcados`, () => {
          const entry = data.projects[slug][locale];
          expect(entry.results).toContain("{{TODO:");
          expect(entry.process).toContain("{{TODO:");
        });

        it(`${locale}: una descripción de alt por captura, sin marcadores y distinta del título genérico`, () => {
          const alts = data.projects[slug].alt[locale];
          expect(alts).toHaveLength(IMAGE_COUNT[slug]);
          for (const alt of alts) {
            expect(alt.length).toBeGreaterThan(30);
            expect(alt.length).toBeLessThanOrEqual(240);
            expect(alt).not.toContain("{{TODO");
          }
          expect(new Set(alts).size).toBe(alts.length);
        });
      }
    });
  }

  it("no afirma stacks que contradicen la evidencia pública: Next.js solo se nombra en sentry-crm", () => {
    for (const slug of SLUGS.filter((s) => s !== "sentry-crm")) {
      for (const locale of LOCALES) {
        const entry = data.projects[slug][locale];
        for (const chapter of CHAPTERS) {
          // Los marcadores TODO sí pueden citar la discrepancia para quien los completa.
          const visible = parseCaseText(entry[chapter])
            .flatMap((block) => (block.type === "list" ? block.items : [block.text]))
            .filter((chunk) => !chunk.includes("{{TODO"))
            .join(" ");
          expect(visible, `${slug}/${locale}/${chapter}`).not.toMatch(/Next\.js/);
        }
      }
    }
  });
});
