import { describe, expect, it } from "vitest";
import {
  BLOG_POST_SLUGS,
  SERVICE_IDS,
  SERVICE_SLUGS,
  localizeInternalHref,
  localizeLegacyPath,
  postKeyFromSlug,
  postSlugCandidates,
  publicPostSlug,
  serviceIdFromSlug,
  serviceSlugFor,
} from "./slugs";
import { getServicesContent } from "@/content/services";

describe("slugs de servicios", () => {
  it("cubre exactamente el catálogo de servicios, en los tres idiomas", () => {
    for (const locale of ["es", "en", "fr"] as const) {
      expect([...SERVICE_IDS].sort()).toEqual(getServicesContent(locale).services.map((s) => s.slug).sort());
    }
  });

  it("el español conserva sus slugs y los nativos se resuelven a su id", () => {
    for (const id of SERVICE_IDS) {
      expect(serviceSlugFor(id, "es")).toBe(id);
      for (const locale of ["es", "en", "fr"] as const) expect(serviceIdFromSlug(SERVICE_SLUGS[id][locale], locale)).toBe(id);
    }
    expect(serviceIdFromSlug("legacy-software-migration", "fr")).toBeUndefined();
  });

  it("el inglés y el francés ya no usan el slug en español (salvo coincidencias legítimas)", () => {
    for (const id of SERVICE_IDS) {
      expect(SERVICE_SLUGS[id].en, id).not.toBe(id);
      expect(SERVICE_SLUGS[id].fr, id).not.toBe(id);
    }
  });
});

describe("slugs de posts", () => {
  it("los slugs nativos no chocan con una clave de otro post ni entre idiomas", () => {
    const keys = new Set(Object.keys(BLOG_POST_SLUGS));
    for (const locale of ["en", "fr"] as const) {
      const slugs = Object.values(BLOG_POST_SLUGS).map((s) => s[locale]);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) {
        expect(keys.has(slug), slug).toBe(false);
        expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(slug.length).toBeLessThanOrEqual(100);
      }
    }
  });

  it("publicPostSlug y postKeyFromSlug son inversos; un post desconocido conserva su slug", () => {
    for (const key of Object.keys(BLOG_POST_SLUGS)) {
      for (const locale of ["es", "en", "fr"] as const) {
        const slug = publicPostSlug(key, locale);
        expect(postKeyFromSlug(slug, locale)).toBe(key);
      }
    }
    expect(publicPostSlug("post-nuevo", "en")).toBe("post-nuevo");
    expect(postKeyFromSlug("post-nuevo", "fr")).toBe("post-nuevo");
  });

  it("una fila se encuentra con el slug histórico o con el nuevo", () => {
    expect(postSlugCandidates("legacy-system-migration-without-downtime", "en").sort()).toEqual(
      ["legacy-system-migration-without-downtime", "migracion-sistemas-legados-sin-interrupcion"].sort()
    );
    expect(postSlugCandidates("migracion-sistemas-legados-sin-interrupcion", "fr").sort()).toEqual(
      ["migracion-sistemas-legados-sin-interrupcion", "migration-systeme-legacy-sans-interruption"].sort()
    );
    expect(postSlugCandidates("post-nuevo", "es")).toEqual(["post-nuevo"]);
  });
});

describe("enlaces internos", () => {
  it("localizeLegacyPath lleva la ruta histórica a la nueva conservando ancla y consulta", () => {
    expect(localizeLegacyPath("/en/servicios/migracion-datos-legacy#faq")).toBe("/en/services/legacy-software-migration#faq");
    expect(localizeLegacyPath("/fr/blog/deuda-tecnica-como-detectarla?x=1")).toBe("/fr/blog/detecter-dette-technique?x=1");
    expect(localizeLegacyPath("/en/servicios/")).toBe("/en/services");
    expect(localizeLegacyPath("/servicios/migracion-datos-legacy")).toBe("/servicios/migracion-datos-legacy");
    expect(localizeLegacyPath("/en/cotizador")).toBe("/en/cotizador");
  });

  it("localizeInternalHref arregla los enlaces sin prefijo de idioma dentro de un contenido en inglés/francés", () => {
    expect(localizeInternalHref("/portafolio", "en")).toBe("/en/portfolio");
    expect(localizeInternalHref("/portafolio/sentry-crm", "fr")).toBe("/fr/portfolio/sentry-crm");
    expect(localizeInternalHref("/cotizador", "fr")).toBe("/fr/cotizador");
    expect(localizeInternalHref("/preguntas-frecuentes", "en")).toBe("/en/faq");
    expect(localizeInternalHref("/servicios/seguridad-cumplimiento", "en")).toBe("/en/services/software-security-compliance");
    expect(localizeInternalHref("/blog/buenas-practicas-apis-rest", "fr")).toBe("/fr/blog/architecture-api-rest-bonnes-pratiques");
    expect(localizeInternalHref("/#contacto", "en")).toBe("/en/#contacto");
  });

  it("localizeInternalHref no toca el español, lo que ya tiene prefijo ni lo que no reconoce", () => {
    expect(localizeInternalHref("/portafolio", "es")).toBe("/portafolio");
    expect(localizeInternalHref("/en/portfolio", "en")).toBe("/en/portfolio");
    expect(localizeInternalHref("/politica-privacidad", "en")).toBe("/politica-privacidad");
    expect(localizeInternalHref("/servicios/no-existe", "en")).toBe("/servicios/no-existe");
    expect(localizeInternalHref("//externo.com", "en")).toBe("//externo.com");
  });
});
