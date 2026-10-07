import { describe, expect, it } from "vitest";
import {
  auditParsedPage,
  flagDuplicateTitles,
  normalizeUrl,
  parseHtml,
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
