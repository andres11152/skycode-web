import { describe, expect, it } from "vitest";
import {
  ABSOLUTE_TITLE_CLUSTERS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  KEYWORD_MAP,
  SEO_LOCALES,
  SERVICE_CLUSTER_IDS,
  TITLE_ABSOLUTE_MAX,
  TITLE_OWN_MAX,
  containsKeyword,
  findEntryByPath,
  getPageSeo,
  listKeywordEntries,
  normalizeForMatch,
  type ClusterId,
} from "./keyword-map";
import { getHeroContent } from "@/content/hero";
import { getServicesContent } from "@/content/services";
import { blogPostPath } from "@/lib/blogPaths";
import { servicePath, servicesIndexPath } from "@/lib/serviceMetadata";
import { localeHomePath } from "@/lib/i18n";
import { titleSuffix, TITLE_MAX_LENGTH } from "@/lib/site";

const entries = listKeywordEntries();
const isAbsolute = (cluster: string) => (ABSOLUTE_TITLE_CLUSTERS as readonly string[]).includes(cluster);

describe("keyword map", () => {
  for (const locale of SEO_LOCALES) {
    const ofLocale = entries.filter((e) => e.locale === locale);

    describe(locale, () => {
      it("cada keyword primaria pertenece a una sola URL", () => {
        const byKeyword = new Map<string, string[]>();
        for (const e of ofLocale) {
          const key = normalizeForMatch(e.primaryKeyword);
          byKeyword.set(key, [...(byKeyword.get(key) ?? []), e.cluster]);
        }
        const duplicated = [...byKeyword].filter(([, clusters]) => clusters.length > 1);
        expect(duplicated).toEqual([]);
      });

      it("ninguna keyword secundaria es la primaria de otra URL", () => {
        const primaries = new Map(ofLocale.map((e) => [normalizeForMatch(e.primaryKeyword), e.cluster]));
        for (const e of ofLocale) {
          for (const secondary of e.secondaryKeywords) {
            const owner = primaries.get(normalizeForMatch(secondary));
            expect(owner === undefined || owner === e.cluster, `${e.cluster}: "${secondary}" es primaria de ${owner}`).toBe(true);
          }
        }
      });

      it("title, H1 y descripción no se repiten entre páginas", () => {
        for (const field of ["title", "h1", "description"] as const) {
          const values = ofLocale.map((e) => normalizeForMatch(e[field]));
          expect(new Set(values).size, `${field} duplicado en ${locale}`).toBe(values.length);
        }
      });

      it("la ruta objetivo es única", () => {
        const paths = ofLocale.map((e) => e.targetPath);
        expect(new Set(paths).size).toBe(paths.length);
      });

      it("ninguna página usa en su title o H1 la keyword primaria de OTRA página", () => {
        for (const page of ofLocale) {
          for (const owner of ofLocale) {
            if (owner.cluster === page.cluster) continue;
            expect(containsKeyword(page.title, owner.primaryKeyword), `${page.cluster}/title invade "${owner.primaryKeyword}"`).toBe(false);
            expect(containsKeyword(page.h1, owner.primaryKeyword), `${page.cluster}/h1 invade "${owner.primaryKeyword}"`).toBe(false);
          }
        }
      });
    });
  }

  it("la keyword primaria aparece en el title y en el H1 de su página", () => {
    for (const e of entries) {
      expect(containsKeyword(e.title, e.primaryKeyword), `${e.cluster}/${e.locale} title`).toBe(true);
      expect(containsKeyword(e.h1, e.primaryKeyword), `${e.cluster}/${e.locale} h1`).toBe(true);
    }
  });

  it("respeta los límites de largo (título ≤ 60 con sufijo, descripción 140–155)", () => {
    for (const e of entries) {
      const final = isAbsolute(e.cluster) ? e.title.length : e.title.length + titleSuffix.length;
      expect(final, `${e.cluster}/${e.locale} título final`).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
      expect(e.title.length, `${e.cluster}/${e.locale} título propio`).toBeLessThanOrEqual(isAbsolute(e.cluster) ? TITLE_ABSOLUTE_MAX : TITLE_OWN_MAX);
      expect(e.description.length, `${e.cluster}/${e.locale} descripción`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(e.description.length, `${e.cluster}/${e.locale} descripción`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("la home es brand-first y su título/H1 no se parecen a los del servicio de software a la medida", () => {
    for (const locale of SEO_LOCALES) {
      const home = getPageSeo("brand", locale);
      const service = getPageSeo("desarrollo-software-medida", locale);
      expect(home.title.toLowerCase().startsWith("skycode")).toBe(true);
      expect(home.absoluteTitle).toBe(true);
      expect(home.title).not.toBe(service.title);
      expect(home.h1).not.toBe(service.h1);
    }
  });

  it("las rutas objetivo coinciden con las que construye el sitio", () => {
    for (const locale of SEO_LOCALES) {
      expect(KEYWORD_MAP.brand[locale].targetPath).toBe(localeHomePath(locale));
      expect(KEYWORD_MAP["services-index"][locale].targetPath).toBe(servicesIndexPath(locale));
      for (const id of SERVICE_CLUSTER_IDS) {
        expect(KEYWORD_MAP[id as ClusterId][locale].targetPath, `${locale}/${id}`).toBe(servicePath(locale, id));
      }
      expect(KEYWORD_MAP["migracion-legacy-guia"][locale].targetPath).toBe(
        blogPostPath(locale, "migracion-sistemas-legados-sin-interrupcion")
      );
    }
  });

  it("todos los servicios del catálogo tienen un clúster", () => {
    for (const locale of SEO_LOCALES) {
      const ids = getServicesContent(locale).services.map((s) => s.slug).sort();
      expect(ids).toEqual([...SERVICE_CLUSTER_IDS].sort());
    }
  });

  it("el H1 de la home que pinta el Hero es el del mapa", () => {
    for (const locale of SEO_LOCALES) {
      const hero = getHeroContent(locale);
      expect(`${hero.titleBefore}${hero.titleAccent}${hero.titleAfter}`).toBe(KEYWORD_MAP.brand[locale].h1);
      expect(hero.titleAccent.length, "la frase en gris debe cerrar el H1").toBeGreaterThan(0);
    }
  });

  it("findEntryByPath encuentra la página dueña de una ruta", () => {
    expect(findEntryByPath("/servicios/migracion-datos-legacy")?.cluster).toBe("migracion-datos-legacy");
    expect(findEntryByPath("/en/")?.cluster).toBe("brand"); // la barra final se ignora
    expect(findEntryByPath("/en")?.cluster).toBe("brand");
    expect(findEntryByPath("/no-existe")).toBeUndefined();
  });

  it("containsKeyword ignora tildes, mayúsculas, '&' y apóstrofes tipográficos", () => {
    expect(containsKeyword("Intégration de systèmes et développement d’API", "intégration de systèmes et développement d'api")).toBe(true);
    expect(containsKeyword("System Integration & API Development", "system integration and api development")).toBe(true);
    expect(containsKeyword("Desarrollo web", "desarrollo")).toBe(true);
    expect(containsKeyword("Desarrollos web", "desarrollo")).toBe(false);
  });
});
