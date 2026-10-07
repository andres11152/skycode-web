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
import { existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "src/content/lastmod.json");
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

writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");
console.log(`seo:lastmod → ${Object.keys(result).length} páginas escritas en src/content/lastmod.json`);
