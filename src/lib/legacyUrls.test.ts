import { describe, expect, it } from "vitest";
import { resolveLegacyUrl, stripTrailingSlash } from "./legacyUrls";

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
    "/en/servicios",
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
