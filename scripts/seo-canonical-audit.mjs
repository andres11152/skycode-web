#!/usr/bin/env node
// Auditoría de canonical, hreflang e indexabilidad contra el SITEMAP real.
//
//   BASE_URL=https://skycode.agency npm run seo:canonical
//   BASE_URL=http://localhost:3000   npm run seo:canonical     (las URLs del sitemap se piden en BASE_URL)
//
// Para cada <url> del sitemap, con parámetros de campaña añadidos (?utm_source=…&gclid=…):
//   · responde 200 sin redirección (una URL del sitemap que redirige o falla no debe estar ahí);
//   · exactamente UN <link rel="canonical">, igual a la <loc> del sitemap (sin parámetros, sin barra final);
//   · sin `noindex` (meta robots ni X-Robots-Tag);
//   · los <link rel="alternate" hreflang> del HTML son EXACTAMENTE los `xhtml:link` del sitemap;
//   · cada URL de hreflang es a su vez una <loc> del sitemap;
//   · ninguna <loc> termina en "/" (salvo la raíz) ni lleva query.
// Sale con código 1 si algo falla. Sin dependencias: Node 22.
const base = (process.env.BASE_URL ?? process.argv[2] ?? "https://skycode.agency").replace(/\/$/, "");
const TRACKING = "utm_source=audit&utm_medium=audit&utm_campaign=audit&gclid=audit123&fbclid=audit456";

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

const sitemapXml = await (await fetch(`${base}/sitemap.xml`)).text();
const entries = [...sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
  const block = m[1];
  const loc = decode(/<loc>([^<]+)<\/loc>/.exec(block)?.[1] ?? "");
  const alternates = [...block.matchAll(/<xhtml:link[^>]*>/g)].map((a) => ({
    lang: /hreflang="([^"]+)"/.exec(a[0])?.[1] ?? "",
    href: decode(/href="([^"]+)"/.exec(a[0])?.[1] ?? ""),
  }));
  return { loc, alternates };
});
const locSet = new Set(entries.map((e) => e.loc));
const problems = [];
const fail = (url, msg) => problems.push(`${url}  →  ${msg}`);

function attr(tag, name) {
  return new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1];
}

async function audit(entry, index) {
  const { loc, alternates } = entry;
  const url = new URL(loc);
  if (url.search) fail(loc, "la <loc> del sitemap lleva parámetros");
  if (url.pathname !== "/" && url.pathname.endsWith("/")) fail(loc, "la <loc> termina en barra");
  for (const alt of alternates) if (!locSet.has(alt.href)) fail(loc, `hreflang ${alt.lang} (${alt.href}) no es una <loc> del sitemap`);

  const target = `${base}${url.pathname}?${TRACKING}`;
  let res;
  try {
    res = await fetch(target, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; seo-canonical-audit)" } });
  } catch (error) {
    return fail(loc, `no se pudo pedir: ${error.message}`);
  }
  if (res.status !== 200) return fail(loc, `estado ${res.status} (debe ser 200 sin redirección)`);
  if (/noindex/i.test(res.headers.get("x-robots-tag") ?? "")) fail(loc, "X-Robots-Tag noindex");
  const html = await res.text();

  const canonicals = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*>/gi)].map((m) => decode(attr(m[0], "href") ?? ""));
  if (canonicals.length !== 1) fail(loc, `${canonicals.length} canonical (debe haber 1)`);
  else if (canonicals[0] !== loc) fail(loc, `canonical = ${canonicals[0]} (debe ser ${loc})`);

  const robots = [...html.matchAll(/<meta[^>]*name="robots"[^>]*>/gi)].map((m) => attr(m[0], "content") ?? "");
  if (robots.some((content) => /noindex/i.test(content))) fail(loc, `meta robots: ${robots.join(" | ")}`);

  const htmlAlts = [...html.matchAll(/<link[^>]*rel="alternate"[^>]*hreflang="[^"]*"[^>]*>/gi)]
    .map((m) => `${attr(m[0], "hreflang")} ${decode(attr(m[0], "href") ?? "")}`)
    .sort();
  const sitemapAlts = alternates.map((a) => `${a.lang} ${a.href}`).sort();
  if (JSON.stringify(htmlAlts) !== JSON.stringify(sitemapAlts)) {
    fail(loc, `hreflang del HTML ≠ sitemap\n        HTML:    ${htmlAlts.join(", ") || "(ninguno)"}\n        sitemap: ${sitemapAlts.join(", ") || "(ninguno)"}`);
  }
  if (index % 10 === 0) process.stdout.write(".");
}

// Concurrencia 6.
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < entries.length) {
      const i = next++;
      await audit(entries[i], i);
    }
  }),
);

console.log(`\n${entries.length} URLs del sitemap auditadas en ${base}`);
if (problems.length) {
  console.log(`\n✘ ${problems.length} problema(s):\n`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("✔ Todas: 200 sin redirección, canonical único y exacto (sin parámetros ni barra), sin noindex, hreflang idéntico al sitemap.");
