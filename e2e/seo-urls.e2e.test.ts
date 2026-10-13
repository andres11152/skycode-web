import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../src/lib/db";
import { resetTestDb } from "../src/lib/testHelpers/db";
import { BASE_URL } from "./helpers/config";
import { revalidatePublicPages } from "./helpers/revalidate";
import { BLOG_POST_SLUGS, SERVICE_IDS, SERVICE_SLUGS, listLocalizedSlugRedirects, publicPostSlug } from "../src/seo/slugs";

// Slugs nativos de servicios y blog en inglés/francés (fase 3 del programa de SEO), contra el servidor
// real: cada URL histórica responde UN 301 hacia una URL que responde 200, el canonical es la propia
// URL, el hreflang cruza los slugs de cada idioma y el sitemap solo lista las URLs nuevas.

const LOCALES = ["es", "en", "fr"] as const;
const PREFIX = { es: "", en: "/en", fr: "/fr" } as const;
const SERVICES = { es: "servicios", en: "services", fr: "services" } as const;

const fetchManual = (path: string) => fetch(`${BASE_URL}${path}`, { redirect: "manual" });
const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1] ?? null;
const canonicalOf = (html: string) => attr(html, /<link rel="canonical" href="([^"]+)"/);
const hreflangsOf = (html: string) =>
  Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));

async function insertPosts(storedSlug: (key: string, locale: (typeof LOCALES)[number]) => string) {
  await resetTestDb();
  for (const key of Object.keys(BLOG_POST_SLUGS)) {
    for (const locale of LOCALES) {
      await query(
        `INSERT INTO articles (slug, locale, status, title, description, author, author_slug, tags, content, published_at)
         VALUES ($1, $2, 'published', $3, $4, 'Autor', 'cesar-leon', '{}', $5, now());`,
        [
          storedSlug(key, locale),
          locale,
          `Título ${key} (${locale})`,
          `Descripción de ${key} en ${locale}.`,
          JSON.stringify([{ type: "paragraph", text: `Texto del post ${key}.` }]),
        ]
      );
    }
  }
  // El sitemap y las páginas del blog se generan estáticas (ISR): sin invalidar verían los datos del build.
  await revalidatePublicPages();
}

async function expectRedirectChain(from: string, to: string) {
  const first = await fetchManual(from);
  expect(first.status, `${from} debe responder 301`).toBe(301);
  const location = first.headers.get("location") ?? "";
  expect(new URL(location, BASE_URL).pathname, `${from} → destino`).toBe(to);
  const second = await fetchManual(to);
  expect(second.status, `${to} (destino de ${from}) debe responder 200 sin más saltos`).toBe(200);
}

describe("servicios con slug nativo", () => {
  it("cada URL histórica en inglés/francés responde 301 → la nueva, que responde 200", async () => {
    const redirects = listLocalizedSlugRedirects().filter((r) => r.from.includes("/servicios"));
    expect(redirects.length).toBe(2 * (SERVICE_IDS.length + 1));
    for (const { from, to } of redirects) await expectRedirectChain(from, to);
  });

  it("la barra final tampoco forma una cadena", async () => {
    const res = await fetchManual("/en/servicios/migracion-datos-legacy/");
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location") ?? "", BASE_URL).pathname).toBe("/en/services/legacy-software-migration");
  });

  it("el español conserva sus URLs y la nueva ruta con slug en español no existe en inglés", async () => {
    expect((await fetchManual("/servicios/migracion-datos-legacy")).status).toBe(200);
    expect((await fetchManual("/en/services/migracion-datos-legacy")).status).toBe(404);
    expect((await fetchManual("/en/services/no-existe")).status).toBe(404);
  });

  it("cada página de servicio: canonical propio, hreflang con el slug de cada idioma y x-default en español", async () => {
    for (const id of SERVICE_IDS) {
      for (const locale of LOCALES) {
        const path = `${PREFIX[locale]}/${SERVICES[locale]}/${SERVICE_SLUGS[id][locale]}`;
        const html = await (await fetchManual(path)).text();
        expect(canonicalOf(html), path).toBe(`https://skycode.agency${path}`);
        const langs = hreflangsOf(html);
        expect(Object.keys(langs).sort(), path).toEqual(["en", "es", "fr", "x-default"]);
        for (const l of LOCALES) {
          expect(langs[l], `${path} hreflang ${l}`).toBe(`https://skycode.agency${PREFIX[l]}/${SERVICES[l]}/${SERVICE_SLUGS[id][l]}`);
        }
        expect(langs["x-default"]).toBe(langs.es);
      }
    }
  });
});

describe.each([
  ["filas con el slug histórico (antes de correr db:seo-localized-slugs)", (key: string) => key],
  ["filas renombradas al slug nativo (después de correrlo)", (key: string, locale: (typeof LOCALES)[number]) => publicPostSlug(key, locale)],
] as const)("blog con slug nativo: %s", (_label, storedSlug) => {
  beforeAll(async () => {
    await insertPosts(storedSlug);
  });

  it("cada URL histórica del blog responde 301 → la nueva, que responde 200", async () => {
    const redirects = listLocalizedSlugRedirects().filter((r) => r.from.includes("/blog/"));
    expect(redirects.length).toBe(12);
    for (const { from, to } of redirects) await expectRedirectChain(from, to);
  });

  it("canonical propio y hreflang con el slug nativo de cada idioma", async () => {
    for (const key of Object.keys(BLOG_POST_SLUGS)) {
      for (const locale of LOCALES) {
        const path = `${PREFIX[locale]}/blog/${publicPostSlug(key, locale)}`;
        const res = await fetchManual(path);
        expect(res.status, path).toBe(200);
        const html = await res.text();
        expect(canonicalOf(html), path).toBe(`https://skycode.agency${path}`);
        const langs = hreflangsOf(html);
        for (const l of LOCALES) expect(langs[l], `${path} hreflang ${l}`).toBe(`https://skycode.agency${PREFIX[l]}/blog/${publicPostSlug(key, l)}`);
        expect(langs["x-default"]).toBe(langs.es);
      }
    }
  });

  it("el sitemap lista solo las URLs nuevas, con su hreflang cruzado", async () => {
    const xml = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    for (const { from, to } of listLocalizedSlugRedirects()) {
      expect(locs, `el sitemap no debe listar la URL histórica ${from}`).not.toContain(from);
      expect(locs, `el sitemap debe listar ${to}`).toContain(to);
    }
    const key = "migracion-sistemas-legados-sin-interrupcion";
    const enUrl = `https://skycode.agency/en/blog/${publicPostSlug(key, "en")}`;
    const frUrl = `https://skycode.agency/fr/blog/${publicPostSlug(key, "fr")}`;
    expect(xml).toContain(`hreflang="en" href="${enUrl}"`);
    expect(xml).toContain(`hreflang="fr" href="${frUrl}"`);
  });
});
