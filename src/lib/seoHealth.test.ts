import { describe, expect, it } from "vitest";
import {
  auditParsedPage,
  buildAlternateGroups,
  flagDuplicateH1,
  flagDuplicateTitles,
  normalizeUrl,
  parseHtml,
  parseSitemapAlternates,
  parseSitemapLocs,
  runSeoHealthCheck,
  summarizeReport,
} from "./seoHealth";

const OK_HTML = `<!doctype html><html><head>
<title>Servicios de Desarrollo | SkyCode</title>
<meta name="description" content="Descripción corta &amp; clara.">
<link rel="canonical" href="https://skycode.agency/servicios">
</head><body><h1>Servicios <span>de software</span></h1>
<script>self.__next_f.push(["<h1>no cuenta</h1>"])</script></body></html>`;

describe("parseHtml", () => {
  it("extrae título, descripción, canonical y H1 ignorando los <script>", () => {
    const parsed = parseHtml(OK_HTML);
    expect(parsed.title).toBe("Servicios de Desarrollo | SkyCode");
    expect(parsed.description).toBe("Descripción corta & clara.");
    expect(parsed.canonical).toBe("https://skycode.agency/servicios");
    expect(parsed.h1Count).toBe(1);
    expect(parsed.h1Text).toBe("Servicios de software");
  });

  it("cuenta imágenes sin alt pero acepta alt vacío decorativo", () => {
    expect(parseHtml('<img src="a"><img src="b" alt=""><img src="c" alt="Logo">').imagesWithoutAlt).toBe(1);
  });

  it("no cuenta H1 ocultos", () => {
    expect(parseHtml("<h1 hidden>x</h1><h1>y</h1>").h1Count).toBe(1);
  });
});

describe("normalizeUrl", () => {
  it("ignora la barra final pero no el origen ni la ruta", () => {
    expect(normalizeUrl("https://skycode.agency/")).toBe(normalizeUrl("https://skycode.agency"));
    expect(normalizeUrl("https://skycode.agency/blog/")).toBe("https://skycode.agency/blog");
    expect(normalizeUrl("https://skycode.agency/blog")).not.toBe(normalizeUrl("https://skycode.agency/"));
  });
});

describe("auditParsedPage", () => {
  const url = "https://skycode.agency/servicios";
  it("no reporta nada en una página correcta", () => {
    expect(auditParsedPage(url, { status: 200, ttfbMs: 40, html: OK_HTML }).issues).toEqual([]);
  });

  it("marca el canonical que apunta a la home (el bug original)", () => {
    const html = OK_HTML.replace("https://skycode.agency/servicios", "https://skycode.agency");
    const codes = auditParsedPage(url, { status: 200, ttfbMs: 40, html }).issues.map((i) => i.code);
    expect(codes).toContain("canonical_mismatch");
  });

  it("marca título largo, descripción larga, sin H1 y marcadores TODO", () => {
    const html = `<title>${"x".repeat(61)}</title><meta name="description" content="${"y".repeat(161)}"><link rel="canonical" href="${url}"><p>{{TODO: dato}}</p>`;
    const codes = auditParsedPage(url, { status: 200, ttfbMs: 1, html }).issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["title_too_long", "description_too_long", "h1_count", "todo_placeholder"]));
  });

  it("marca status distinto de 200 y noindex dentro del sitemap", () => {
    expect(auditParsedPage(url, { status: 404, ttfbMs: 1, html: null }).issues[0].code).toBe("status");
    const html = OK_HTML.replace("<head>", '<head><meta name="robots" content="noindex, follow">');
    expect(auditParsedPage(url, { status: 200, ttfbMs: 1, html }).issues.map((i) => i.code)).toContain("noindex_in_sitemap");
  });
});

describe("flagDuplicateTitles", () => {
  it("marca todas las páginas que comparten título", () => {
    const mk = (u: string, title: string) => ({ ...auditParsedPage(u, { status: 200, ttfbMs: 1, html: OK_HTML }), url: u, title, issues: [] });
    const pages = flagDuplicateTitles([mk("https://a/1", "Igual"), mk("https://a/2", "igual"), mk("https://a/3", "Distinto")]);
    expect(pages[0].issues.map((i) => i.code)).toEqual(["title_duplicate"]);
    expect(pages[1].issues.map((i) => i.code)).toEqual(["title_duplicate"]);
    expect(pages[2].issues).toEqual([]);
    expect(summarizeReport(pages).duplicateTitles).toBe(2);
  });
});

describe("runSeoHealthCheck", () => {
  it("recorre el sitemap, pide las rutas en el origen auditado y compara contra la URL pública", async () => {
    const fetched: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const target = String(input);
      fetched.push(target);
      if (target.endsWith("/sitemap.xml")) {
        return new Response(
          "<urlset><url><loc>https://skycode.agency/servicios</loc></url><url><loc>https://skycode.agency/malo</loc></url></urlset>"
        );
      }
      const canonical = target.endsWith("/servicios") ? "https://skycode.agency/servicios" : "https://skycode.agency/";
      return new Response(OK_HTML.replace("https://skycode.agency/servicios", canonical).replace("Servicios de Desarrollo", target.slice(-6)), { status: 200 });
    }) as typeof fetch;

    const report = await runSeoHealthCheck({ baseUrl: "http://localhost:4173", fetchImpl });
    expect(fetched).toContain("http://localhost:4173/servicios");
    expect(report.totals.pages).toBe(2);
    expect(report.totals.canonicalErrors).toBe(1);
    expect(report.pages.find((p) => p.url.endsWith("/malo"))?.issues.map((i) => i.code)).toContain("canonical_mismatch");
  });

  it("falla si el sitemap no responde", async () => {
    const fetchImpl = (async () => new Response("", { status: 500 })) as typeof fetch;
    await expect(runSeoHealthCheck({ baseUrl: "http://x", fetchImpl })).rejects.toThrow(/sitemap/);
  });
});

describe("parseSitemapLocs", () => {
  it("lee todas las <loc>", () => {
    expect(parseSitemapLocs("<a><loc>https://a/1</loc></a><loc> https://a/2 </loc>")).toEqual(["https://a/1", "https://a/2"]);
  });
});

describe("keyword primaria del mapa de keywords", () => {
  const url = "https://skycode.agency/servicios/migracion-datos-legacy";
  const expectation = { path: "/servicios/migracion-datos-legacy", cluster: "migracion-datos-legacy", locale: "es" as const, primaryKeyword: "servicios de migración de sistemas legacy" };
  const page = (title: string, h1: string) =>
    `<title>${title}</title><meta name="description" content="d"><link rel="canonical" href="${url}"><h1>${h1}</h1>`;
  const codes = (html: string) => auditParsedPage(url, { status: 200, ttfbMs: 1, html }, { expectation }).issues.map((i) => i.code);

  it("pasa cuando la keyword está en el título y en el H1 (sin tildes ni mayúsculas)", () => {
    expect(codes(page("Servicios de migración de sistemas legacy | SkyCode", "Servicios de Migracion de Sistemas Legacy: sin downtime"))).not.toContain("keyword_primary_missing");
  });

  it("falla si falta en el título, en el H1 o en ambos, y dice dónde", () => {
    for (const [title, h1, where] of [
      ["Migración de datos | SkyCode", "Servicios de migración de sistemas legacy", "el título"],
      ["Servicios de migración de sistemas legacy | SkyCode", "Migración y modernización de datos", "el H1"],
      ["Otro | SkyCode", "Otro", "el título ni en el H1"],
    ] as const) {
      const result = auditParsedPage(url, { status: 200, ttfbMs: 1, html: page(title, h1) }, { expectation });
      const found = result.issues.find((i) => i.code === "keyword_primary_missing");
      expect(found?.severity).toBe("error");
      expect(found?.message).toContain(where);
    }
  });

  it("sin expectativa no se exige nada", () => {
    expect(auditParsedPage(url, { status: 200, ttfbMs: 1, html: page("Otro", "Otro") }).issues.map((i) => i.code)).not.toContain("keyword_primary_missing");
  });
});

describe("hreflang contra el sitemap", () => {
  const url = "https://skycode.agency/servicios/migracion-datos-legacy";
  const en = "https://skycode.agency/en/services/legacy-software-migration";
  const sitemapAlternates = { es: url, en, "x-default": url };
  const sitemapUrls = new Set([url, en]);
  const base = `<title>t</title><meta name="description" content="d"><link rel="canonical" href="${url}"><h1>h</h1>`;
  const alt = (lang: string, href: string) => `<link rel="alternate" hrefLang="${lang}" href="${href}"/>`;
  const run = (links: string) =>
    auditParsedPage(url, { status: 200, ttfbMs: 1, html: base + links }, { sitemapAlternates, sitemapUrls }).issues.find((i) => i.code === "hreflang_incomplete");

  it("pasa si el HTML repite exactamente lo que declara el sitemap, con autorreferencia y x-default", () => {
    expect(run(alt("es", url) + alt("en", en) + alt("x-default", url))).toBeUndefined();
  });

  it("falla si falta un idioma, difiere un destino o sobra uno", () => {
    expect(run(alt("es", url) + alt("x-default", url))?.message).toContain('falta hreflang="en"');
    expect(run(alt("es", url) + alt("en", "https://skycode.agency/en/servicios/x") + alt("x-default", url))?.message).toContain('hreflang="en" apunta a');
    expect(run(alt("es", url) + alt("en", en) + alt("fr", en) + alt("x-default", url))?.message).toContain('hreflang="fr" no figura');
  });

  it("falla si ningún hreflang apunta a la propia página o si apunta a una URL fuera del sitemap", () => {
    const noSelf = auditParsedPage(url, { status: 200, ttfbMs: 1, html: base + alt("en", en) + alt("x-default", en) }, {
      sitemapAlternates: { en, "x-default": en },
      sitemapUrls,
    }).issues.find((i) => i.code === "hreflang_incomplete");
    expect(noSelf?.message).toContain("autorreferencia");
    const outside = auditParsedPage(url, { status: 200, ttfbMs: 1, html: base + alt("es", url) + alt("en", en) }, {
      sitemapAlternates: { es: url, en },
      sitemapUrls: new Set([url]),
    }).issues.find((i) => i.code === "hreflang_incomplete");
    expect(outside?.message).toContain("no está en el sitemap");
  });

  it("una página sin alternativas en el sitemap (legales, solo en español) no se cruza", () => {
    expect(auditParsedPage(url, { status: 200, ttfbMs: 1, html: base }, { sitemapAlternates: {}, sitemapUrls }).issues).toEqual([]);
  });
});

describe("parseSitemapAlternates", () => {
  it("lee los xhtml:link de cada <url>", () => {
    const xml = `<urlset><url><loc>https://x/a</loc><xhtml:link rel="alternate" hreflang="es" href="https://x/a"/><xhtml:link rel="alternate" hreflang="en" href="https://x/en/a"/></url><url><loc>https://x/b</loc></url></urlset>`;
    const map = parseSitemapAlternates(xml);
    expect(map.get("https://x/a")).toEqual({ es: "https://x/a", en: "https://x/en/a" });
    expect(map.get("https://x/b")).toEqual({});
  });
});

describe("flagDuplicateH1", () => {
  it("avisa (warning, no error) de los H1 repetidos entre URLs", () => {
    const mk = (u: string, h1Text: string) => ({ url: u, fetchedUrl: u, status: 200, ttfbMs: 1, title: "t", description: "d", canonical: u, h1Count: 1, h1Text, robots: null, issues: [] }) as Parameters<typeof flagDuplicateH1>[0][number];
    const pages = flagDuplicateH1([mk("https://x/a", "Mismo H1"), mk("https://x/b", "mismo h1"), mk("https://x/c", "Otro")]);
    expect(pages[0].issues[0]).toMatchObject({ code: "h1_duplicate", severity: "warning" });
    expect(pages[1].issues).toHaveLength(1);
    expect(pages[2].issues).toHaveLength(0);
  });
});

describe("duplicados entre versiones hreflang", () => {
  const mk = (url: string, title: string, h1Text = title) =>
    ({ url, fetchedUrl: url, status: 200, ttfbMs: 1, title, description: "d", canonical: url, h1Count: 1, h1Text, robots: null, issues: [] }) as Parameters<typeof flagDuplicateTitles>[0][number];
  const a = "https://x/equipo/ana";
  const aEn = "https://x/en/equipo/ana";
  const other = "https://x/servicios/otro";
  const groups = buildAlternateGroups(
    new Map<string, Record<string, string>>([
      [a, { es: a, en: aEn }],
      [aEn, { es: a, en: aEn }],
      [other, {}],
    ])
  );

  it("el mismo título en la página y en su versión de otro idioma NO es un duplicado", () => {
    const pages = flagDuplicateTitles([mk(a, "Ana López"), mk(aEn, "Ana López")], groups);
    expect(pages.flatMap((p) => p.issues)).toEqual([]);
    expect(flagDuplicateH1([mk(a, "Ana"), mk(aEn, "Ana")], groups).flatMap((p) => p.issues)).toEqual([]);
  });

  it("sí lo es entre páginas que no son versiones una de otra (la home y el servicio del diagnóstico)", () => {
    const pages = flagDuplicateTitles([mk(a, "Mismo título"), mk(aEn, "Mismo título"), mk(other, "Mismo título")], groups);
    expect(pages[2].issues[0].message).toContain(a);
    expect(pages[0].issues[0].message).toContain(other);
    expect(pages[0].issues[0].message).not.toContain(aEn);
  });

  it("sin grupos se comporta como antes (toda URL distinta cuenta)", () => {
    expect(flagDuplicateTitles([mk(a, "T"), mk(aEn, "T")]).flatMap((p) => p.issues)).toHaveLength(2);
  });
});
