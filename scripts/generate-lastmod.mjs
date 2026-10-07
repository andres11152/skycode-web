#!/usr/bin/env node
// Genera src/content/lastmod.json: la fecha REAL del último cambio de contenido
// de cada página estática, para el `<lastmod>` del sitemap.
//
//   npm run seo:lastmod        (se ejecuta solo antes de `next build` — prebuild)
//
// Por qué no `new Date()`: un lastmod que cambia en cada despliegue en TODAS
// las URLs es ruido y Google aprende a ignorarlo. Aquí cada página toma la
// fecha del último commit que tocó SUS archivos de contenido (JSON del idioma
// + el componente que la pinta); un archivo modificado sin commitear usa su
// mtime. Las páginas que vienen de Postgres (artículos, casos, equipo) usan
// su propio `updated_at` en sitemap.ts, no este archivo.
//
// En un clon superficial (CI, algunos hosts) el historial no existe y todas
// las fechas saldrían iguales a la del despliegue: en ese caso el script NO
// toca el archivo ya versionado.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "src/content/lastmod.json");
// Hash del contenido de cada página de detalle de servicio y su fecha (ver más abajo). Se versiona junto a lastmod.json.
const hashesFile = join(root, "src/content/lastmod-hashes.json");
const LOCALES = ["es", "en", "fr"];

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

try {
  if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
    console.log("seo:lastmod → clon superficial: se conserva src/content/lastmod.json tal como está.");
    process.exit(0);
  }
} catch {
  console.log("seo:lastmod → sin repositorio git: se conserva src/content/lastmod.json tal como está.");
  process.exit(0);
}

const dirty = new Set(
  git(["status", "--porcelain"])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""))
);

function fileDate(relPath) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return null;
  if (dirty.has(relPath)) return statSync(abs).mtime;
  const iso = git(["log", "-1", "--format=%cI", "--", relPath]);
  return iso ? new Date(iso) : statSync(abs).mtime;
}

function latest(paths) {
  const dates = paths.map(fileDate).filter(Boolean);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
}

const L = (locale, names) => names.map((name) => `src/content/locales/${locale}/${name}.json`);

const pages = {};
for (const locale of LOCALES) {
  pages[`home:${locale}`] = L(locale, ["hero", "site", "highlights", "trust", "process", "faq", "closing", "contact", "testimonials", "bento", "services"]).concat([
    "src/components/HomeSections.tsx",
    "src/components/sections/Hero.tsx",
  ]);
  pages[`services-index:${locale}`] = L(locale, ["services", "service-page", "service-seo", "process", "trust"]).concat(["src/components/services/ServicesIndexView.tsx"]);
  pages[`services-detail:${locale}`] = L(locale, ["services", "service-details", "service-seo", "service-page"]).concat(["src/components/services/ServiceView.tsx"]);
  pages[`team:${locale}`] = L(locale, ["team"]).concat(["src/components/team/TeamView.tsx"]);
  pages[`faq:${locale}`] = L(locale, ["faq-page"]).concat(["src/components/faq/FaqPageView.tsx"]);
  pages[`estimator:${locale}`] = L(locale, ["projectEstimator"]).concat(["src/components/sections/CotizadorPageView.tsx", "src/components/sections/ProjectEstimator.tsx"]);
  pages[`portfolio-index:${locale}`] = L(locale, ["projects"]).concat(["src/components/portfolio/PortfolioIndexView.tsx"]);
  pages[`blog-index:${locale}`] = L(locale, ["blog"]).concat(["src/components/blog/BlogIndexView.tsx"]);
}
pages["bogota:es"] = ["src/content/locales/es/bogota.json", "src/components/bogota/BogotaView.tsx"];

const result = {};
for (const [key, files] of Object.entries(pages)) {
  const date = latest(files);
  if (date) result[key] = date;
}

// ── Detalle de servicio: fecha POR PÁGINA, según el contenido real ──────────────────────────────
// Los nueve detalles de un idioma salen de los mismos JSON (service-details, services, service-seo):
// con la fecha del último commit de esos archivos, editar un servicio "actualizaba" los nueve. Aquí
// cada página guarda el hash del contenido que de verdad la pinta —su bloque de service-details, su
// ficha en services/service-seo, el copy compartido de la plantilla (sin la plantilla en sí: maquetar no es editar contenido)— y su fecha
// solo avanza cuando ese hash cambia. Sin hash previo (primera vez) se usa la fecha de los archivos.
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const sha = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 16);
const previous = existsSync(hashesFile) ? JSON.parse(readFileSync(hashesFile, "utf8")) : {};
const hashes = {};
for (const locale of LOCALES) {
  const details = readJson(`src/content/locales/${locale}/service-details.json`);
  const services = Object.fromEntries(readJson(`src/content/locales/${locale}/services.json`).items.map((item) => [item.slug, item]));
  const seo = readJson(`src/content/locales/${locale}/service-seo.json`).items ?? {};
  // El bloque `index` es de la página de índice, no del detalle: se excluye del copy compartido.
  // `detail.tocProof` solo rotula una sección que únicamente existe en las páginas con `proof`
  // (ese contenido ya está en details[slug]); contarlo movería la fecha de todos los servicios.
  // Tampoco entra la plantilla (ServiceView.tsx): un cambio de maquetación no es contenido editado.
  const pageCopy = readJson(`src/content/locales/${locale}/service-page.json`);
  const sharedDetail = Object.fromEntries(Object.entries(pageCopy.detail ?? {}).filter(([key]) => key !== "tocProof"));
  const sharedDetailCopy = Object.fromEntries(Object.entries({ ...pageCopy, detail: sharedDetail }).filter(([key]) => key !== "index"));
  const shared = sha(sharedDetailCopy);
  for (const slug of Object.keys(details)) {
    const key = `services-detail:${locale}:${slug}`;
    const hash = sha([details[slug], services[slug] ?? null, seo[slug] ?? null, shared]);
    const stored = previous[key];
    const date = stored && stored.hash === hash ? stored.date : (result[`services-detail:${locale}`] ?? new Date().toISOString());
    hashes[key] = { hash, date };
    result[key] = date;
  }
}
writeFileSync(hashesFile, JSON.stringify(hashes, null, 2) + "\n");

writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");
console.log(`seo:lastmod → ${Object.keys(result).length} páginas escritas en src/content/lastmod.json`);
