import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Detector de "rastros de IA" en el sitio público. Mismo criterio que
// `cookieInventory.test.ts` y `sqlSafety.test.ts`: la regla vive en un test, no en la memoria
// de quien edita, así que un copy o un componente nuevo que reintroduzca el patrón rompe el CI.
//
// Qué se vigila y por qué (ver "Cero AI slop visual" en CLAUDE.md):
//  - rayas largas (—) en el copy: el marcador textual más repetido de los textos generados;
//  - emoji en el copy: decoración que un estudio no pone en un sitio enterprise;
//  - títulos en "Title Case" en español/francés: calco del inglés;
//  - muletillas de marketing genérico ("siguiente nivel", "sin sorpresas"…);
//  - texto con degradado (`bg-clip-text`) y gradientes púrpura/violeta en componentes públicos.

const ROOT = join(process.cwd(), "src");

function walk(dir: string, filter: (path: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, filter, out);
    else if (filter(path)) out.push(path);
  }
  return out;
}

function strings(value: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((item, index) => strings(item, `${path}[${index}]`, out));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) strings(child, path ? `${path}.${key}` : key, out);
  }
}

const localeFiles = walk(join(ROOT, "content", "locales"), (path) => path.endsWith(".json"));
const allCopy = localeFiles.flatMap((file) => {
  const out: { path: string; text: string }[] = [];
  strings(JSON.parse(readFileSync(file, "utf8")), file.replace(`${ROOT}/content/locales/`, ""), out);
  return out;
});

const BANNED_PHRASES = [
  /siguiente nivel/i,
  /next level/i,
  /prochain niveau/i,
  /sin sorpresas/i,
  /no surprises/i,
  /sans surprises/i,
  /de vanguardia/i,
  /cutting[- ]edge/i,
  /state[- ]of[- ]the[- ]art/i,
  /game[- ]changer/i,
  /soluciones integrales/i,
  /potencia tu/i,
  /unlock the/i,
  /seamless/i,
];

// Nombres propios y siglas que legítimamente van en mayúscula dentro de un título.
const PROPER = new Set([
  "SkyCode", "Bogotá", "Colombia", "Next.js", "React", "Native", "WhatsApp", "Android", "iOS", "Wompi", "PayU",
  "Stripe", "Siigo", "Alegra", "SAP", "Mercado", "Pago", "OWASP", "DevOps", "UI/UX", "ERP", "APIs", "API", "COP",
  "USD", "IA", "RGPD", "Ley", "App", "Store", "Google", "Play", "Enterprise", "SaaS", "Sentry", "CRM", "Jean", "Dupont",
  "Carlos", "Gómez", "Empresa", "Société", "SAS", "Ex.", "Ej.", "Mi", "S.A.S.", "TLS", "QA", "PDF", "Estrangulador",
]);

function looksTitleCase(text: string): boolean {
  const words = text.replace(/[¿?¡!.,:;()]/g, "").split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  const capitalised = words.slice(1).filter((word) => {
    if (word.length <= 3 || PROPER.has(word)) return false;
    if (word === word.toUpperCase()) return false; // sigla
    return /^[A-ZÁÉÍÓÚÑÀÂÈÊÎÔÛÇ][a-záéíóúñàâèêîôûç]/.test(word);
  });
  return capitalised.length >= 2 && capitalised.length / words.length >= 0.3;
}

describe("rastros de IA en el copy público", () => {
  it("no usa rayas largas (—) en ningún idioma", () => {
    const hits = allCopy.filter((entry) => entry.text.includes("—")).map((entry) => `${entry.path}: ${entry.text.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it("no usa emoji en el copy", () => {
    const hits = allCopy.filter((entry) => /\p{Extended_Pictographic}/u.test(entry.text)).map((entry) => `${entry.path}: ${entry.text.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it("no deja sintaxis de markdown ni notas con asterisco sueltas en el copy", () => {
    // Un asterisco de nota al pie sin su par, `**negrita**` o comillas invertidas en un JSON de copy se
    // ven literales en pantalla: ningún componente de copy interpreta markdown.
    const hits = allCopy
      .filter((entry) => /^\s*\*(?!\*)|\*\*|`/.test(entry.text))
      .map((entry) => `${entry.path}: ${entry.text.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it("no usa muletillas de marketing genérico", () => {
    const hits = allCopy
      .filter((entry) => BANNED_PHRASES.some((pattern) => pattern.test(entry.text)))
      .map((entry) => `${entry.path}: ${entry.text.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it("los títulos en español y francés van en tipo oración, no en Title Case", () => {
    const TITLE_KEYS = /(^|\.)(title|badge|heading|h1|seoTitle|indexTitle|label|ctaTitle|closingTitle)$/;
    const hits = allCopy
      .filter((entry) => /^(es|fr)\//.test(entry.path) && TITLE_KEYS.test(entry.path.replace(/\[\d+\]/g, "")))
      .filter((entry) => looksTitleCase(entry.text))
      .map((entry) => `${entry.path}: ${entry.text}`);
    expect(hits).toEqual([]);
  });
});

describe("rastros de IA en los componentes públicos", () => {
  const files = walk(
    join(ROOT, "components"),
    (path) => path.endsWith(".tsx") && !path.includes("/dashboard/") && !path.includes("/portal/"),
  ).concat(walk(join(ROOT, "app"), (path) => path.endsWith(".tsx") && !path.includes("/dashboard/") && !path.includes("/portal/")));

  const scan = (pattern: RegExp) =>
    files.filter((file) => pattern.test(readFileSync(file, "utf8"))).map((file) => file.replace(`${ROOT}/`, ""));

  it("no hay texto con degradado (bg-clip-text)", () => {
    expect(scan(/bg-clip-text/)).toEqual([]);
  });

  it("no hay degradados morado/violeta/fucsia/índigo", () => {
    expect(scan(/(from|via|to)-(purple|violet|fuchsia|indigo|pink)-/)).toEqual([]);
  });

  it("no se usa `rounded-2xl` o mayor (la escala editorial se queda en rounded-xl)", () => {
    expect(scan(/rounded-(2xl|3xl)\b/)).toEqual([]);
  });
});
