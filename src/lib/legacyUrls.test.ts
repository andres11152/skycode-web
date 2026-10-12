import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLegacyUrl, stripTrailingSlash } from "./legacyUrls";
import { SERVICE_IDS, SERVICE_SLUGS, listLocalizedSlugRedirects } from "@/seo/slugs";
import { servicePath, servicesIndexPath } from "./servicePaths";
import { blogPostPath } from "./blogPaths";

const to = (path: string) => {
  const result = resolveLegacyUrl(path);
  return result?.kind === "redirect" ? `${result.status} ${result.to}` : result?.kind ?? null;
};

describe("resolveLegacyUrl: redirecciones 301 (con y sin barra final)", () => {
  it.each([
    ["/es/inicio", "301 /"],
    ["/es/inicio/", "301 /"],
    ["/en/home", "301 /en"],
    ["/en/home/", "301 /en"],
    ["/politica-de-privacidad", "301 /politica-privacidad"],
    ["/politica-de-privacidad/", "301 /politica-privacidad"],
  ])("%s → %s", (path, expected) => expect(to(path)).toBe(expected));

  it.each([
    ["/portafolio/all", "301 /portafolio"],
    ["/portafolio/all/", "301 /portafolio"],
    ["/portafolio-cat/web", "301 /portafolio"],
    ["/portafolio-cat/web/sub-categoria/", "301 /portafolio"],
    ["/portafolio-cat", "301 /portafolio"],
    ["/portfolio/all", "301 /portafolio"],
    ["/portfolio-cat/web", "301 /portafolio"],
    ["/en/portfolio/all", "301 /en/portfolio"],
    ["/en/portfolio-cat/web/", "301 /en/portfolio"],
    ["/fr/portfolio/all", "301 /fr/portfolio"],
    ["/fr/portfolio-cat/web", "301 /fr/portfolio"],
  ])("listados antiguos del portafolio: %s → %s (índice de su idioma)", (path, expected) => expect(to(path)).toBe(expected));

  it("Moncyre (archivado) apunta al índice de su idioma, con o sin barra", () => {
    expect(to("/portafolio/moncyre")).toBe("301 /portafolio");
    expect(to("/portafolio/moncyre/")).toBe("301 /portafolio");
    expect(to("/en/portfolio/moncyre")).toBe("301 /en/portfolio");
    expect(to("/fr/portfolio/moncyre/")).toBe("301 /fr/portfolio");
  });

  it("no distingue mayúsculas (WordPress tampoco lo hacía)", () => {
    expect(to("/ES/Inicio")).toBe("301 /");
    expect(to("/Politica-De-Privacidad")).toBe("301 /politica-privacidad");
  });
});

describe("resolveLegacyUrl: 410 (sin equivalente, nunca a la home)", () => {
  it.each([
    "/feed",
    "/feed/",
    "/comments/feed",
    "/comments/feed/",
    "/blog/feed",
    "/en/feed/",
    "/fr/feed",
    "/servicios/feed",
    "/wp-content/uploads/2020/01/foto.jpg",
    "/wp-content",
    "/wp-includes/js/jquery.js",
    "/wp-admin",
    "/wp-admin/admin-ajax.php",
    "/wp-json/wp/v2/posts",
    "/wp-login.php",
    "/wp-cron.php",
    "/xmlrpc.php",
  ])("%s → 410", (path) => expect(to(path)).toBe("gone"));
});

describe("resolveLegacyUrl: lo legítimo no se toca", () => {
  it.each([
    "/",
    "/en",
    "/fr",
    "/servicios",
    "/servicios/frontend-alto-rendimiento",
    "/en/services",
    "/fr/services",
    "/en/services/legacy-software-migration",
    "/en/blog/legacy-system-migration-without-downtime",
    "/portafolio",
    "/portafolio/sentry-crm",
    "/portafolio/racingbike",
    "/en/portfolio",
    "/en/portfolio/sentry-crm",
    "/fr/portfolio/racingbike",
    "/politica-privacidad",
    "/blog",
    "/blog/ley-1581-guia-tecnica-software",
    "/feed.xml",
    "/en/feed.xml",
    "/fr/feed.xml",
    "/cotizador",
    "/wpress", // empieza por "wp" pero no es WordPress
  ])("%s → null", (path) => expect(to(path)).toBeNull());
});

describe("stripTrailingSlash", () => {
  it("quita la barra final salvo en la raíz", () => {
    expect(stripTrailingSlash("/servicios/")).toBe("/servicios");
    expect(stripTrailingSlash("/en/portfolio//")).toBe("/en/portfolio");
    expect(stripTrailingSlash("/")).toBeNull();
    expect(stripTrailingSlash("/servicios")).toBeNull();
  });
});

describe("resolveLegacyUrl: slugs nativos de servicios y blog en inglés/francés", () => {
  it.each([
    ["/en/servicios", "301 /en/services"],
    ["/fr/servicios/", "301 /fr/services"],
    ["/en/servicios/migracion-datos-legacy", "301 /en/services/legacy-software-migration"],
    ["/fr/servicios/migracion-datos-legacy/", "301 /fr/services/migration-systemes-legacy"],
    ["/en/blog/migracion-sistemas-legados-sin-interrupcion", "301 /en/blog/legacy-system-migration-without-downtime"],
    ["/fr/blog/migracion-sistemas-legados-sin-interrupcion", "301 /fr/blog/migration-systeme-legacy-sans-interruption"],
  ])("%s → %s", (path, expected) => expect(to(path)).toBe(expected));

  it("el español conserva sus URLs (no se redirige nada)", () => {
    expect(to("/servicios")).toBeNull();
    expect(to("/servicios/migracion-datos-legacy")).toBeNull();
    expect(to("/blog/migracion-sistemas-legados-sin-interrupcion")).toBeNull();
  });

  it("nunca hay cadenas: el destino de cada redirección no es a su vez una URL a redirigir", () => {
    for (const { from, to: destination } of listLocalizedSlugRedirects()) {
      expect(resolveLegacyUrl(destination), `${from} → ${destination}`).toBeNull();
      expect(destination).not.toBe(from);
    }
  });

  it("los destinos coinciden con las rutas que construye el sitio", () => {
    const destinations = new Set(listLocalizedSlugRedirects().map((r) => r.to));
    for (const locale of ["en", "fr"] as const) {
      expect(destinations.has(servicesIndexPath(locale))).toBe(true);
      for (const id of SERVICE_IDS) expect(destinations.has(servicePath(locale, id)), `${locale}/${id}`).toBe(true);
    }
    expect(destinations.has(blogPostPath("en", "legacy-system-migration-without-downtime"))).toBe(true);
  });

  it("los slugs nativos son únicos por idioma y siguen un formato de URL seguro", () => {
    for (const locale of ["es", "en", "fr"] as const) {
      const slugs = SERVICE_IDS.map((id) => SERVICE_SLUGS[id][locale]);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("el matcher del proxy cubre cada ruta histórica (el proxy solo corre en rutas del matcher)", () => {
    const source = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
    const matchers = [...source.matchAll(/^\s+"(\/[^"]*)",$/gm)].map((m) => m[1]);
    const matches = (pattern: string, path: string): boolean => {
      const p = pattern.split("/");
      const q = path.split("/");
      return p.length === q.length && p.every((seg, i) => seg.startsWith(":") || seg === q[i]);
    };
    for (const { from } of listLocalizedSlugRedirects()) {
      expect(
        matchers.some((m) => matches(m, from)),
        `${from} no está en el matcher de proxy.ts`
      ).toBe(true);
    }
  });
});
