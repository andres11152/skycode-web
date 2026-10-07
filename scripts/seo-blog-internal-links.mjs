#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-blog-internal-links.mjs [--dry-run]
//      (o `npm run db:seo-blog-links`)
//
// Script de contenido (mismo criterio que seo-legacy-migration-cluster.mjs:
// datos, no esquema). Los posts viven en Postgres, no en el repo, así que
// el enlazado interno contextual del blog se aplica editando los bloques
// `paragraph`/`list` de los posts YA publicados, con las reglas de
// scripts/seed-data/seo/blog-internal-links.json:
//
// - Cada artículo debe terminar con AL MENOS `minInternalLinks` (2) enlaces
//   internos distintos (servicios, otros artículos o casos reales).
//   Primero se cuentan los que el post ya tiene y solo se agregan los que
//   falten; las reglas `always: true` (p. ej. los enlaces entrantes al
//   post de outsourcing) se agregan siempre que aún no estén.
// - Nunca duplica: si el destino ya está enlazado en el post (con
//   cualquier anchor) la regla se salta; un post no enlaza a sí mismo ni
//   repite un destino dos veces.
// - Dos formas de insertar, ambas sin cambiar el sentido del texto: `wrap`
//   envuelve una frase que YA existe (no agrega palabras) y `append` suma
//   una frase breve al final de un párrafo concreto.
// - Solo rutas internas con el prefijo de idioma (`/servicios/x`,
//   `/en/blog/x`, `/fr/portfolio/x`, `/cotizador`...): la sintaxis `[texto](/ruta)` de
//   lib/inlineLinks.ts no admite otra cosa, y las funciones de ruta del
//   sitio (servicePath, blogPostPath, portfolioCasePath) son las que
//   `blogInternalLinks.test.ts` compara contra las de aquí.
//
// A diferencia del script del cluster legacy NO toca `updated_at`: agregar
// un enlace no cambia lo que dice el artículo y marcarlo "Actualizado" (y
// mover su dateModified del JSON-LD) sería fingir frescura. Las páginas
// usan ISR (`revalidate = 3600`): el cambio se ve como mucho una hora
// después, o al instante tras el siguiente deploy.
//
// Idempotente. Todo va en una sola transacción: si una regla no encuentra
// su frase/párrafo (alguien editó el post a mano) o un post con reglas no
// llega al mínimo, aborta sin escribir nada. `--dry-run` imprime el plan y
// revierte.

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";
const __dirname = dirname(fileURLToPath(import.meta.url));

export const LOCALES = ["es", "en", "fr"];

// Misma expresión que lib/inlineLinks.ts (LINK_PATTERN): si cambia allá, cambia aquí.
const LINK_PATTERN = /\[([^\]\n]+)\]\((\/[^)\s]*)\)/g;

/** Prefijo de idioma de las rutas del sitio (el español va sin prefijo). */
const localePrefix = (locale) => (locale === "es" ? "" : `/${locale}`);

/** Ruta pública de un destino — espejo de servicePath / blogPostPath / portfolioCasePath. */
export function pathFor(kind, locale, slug) {
  if (kind === "service") return `${localePrefix(locale)}/servicios/${slug}`;
  if (kind === "post") return `${localePrefix(locale)}/blog/${slug}`;
  if (kind === "case") return locale === "es" ? `/portafolio/${slug}` : `/${locale}/portfolio/${slug}`;
  // Páginas fijas del sitio (no un recurso con slug propio): el cotizador y el índice del portafolio.
  if (kind === "page") {
    if (slug === "cotizador") return `${localePrefix(locale)}/cotizador`;
    if (slug === "portafolio") return locale === "es" ? "/portafolio" : `/${locale}/portfolio`;
  }
  throw new Error(`Tipo de destino desconocido: ${kind}`);
}

const isInternal = (href) => href.startsWith("/") && !href.startsWith("//");
const normalizeHref = (href) => href.split(/[#?]/)[0].replace(/\/+$/, "") || "/";

/** Todos los textos editables de un bloque (párrafo, ítems de lista, respuestas de FAQ). */
function blockTexts(block) {
  if (block.type === "paragraph") return [block.text];
  if (block.type === "list") return block.items;
  if (block.type === "faq") return block.items.map((item) => item.answer);
  return [];
}

/** Destinos internos distintos que ya enlaza un post (sin hash ni query). */
export function internalHrefs(content) {
  const hrefs = new Set();
  for (const block of content) {
    for (const text of blockTexts(block)) {
      for (const match of text.matchAll(LINK_PATTERN)) {
        if (isInternal(match[2])) hrefs.add(normalizeHref(match[2]));
      }
    }
  }
  return hrefs;
}

/** Rangos [inicio, fin) de la sintaxis de enlace dentro de un texto — una frase no puede envolverse dentro de un enlace ya existente. */
function linkSpans(text) {
  return [...text.matchAll(LINK_PATTERN)].map((m) => [m.index, m.index + m[0].length]);
}

/** Primera aparición de `phrase` fuera de cualquier enlace, o -1. */
function findOutsideLinks(text, phrase) {
  const spans = linkSpans(text);
  let from = 0;
  for (;;) {
    const at = text.indexOf(phrase, from);
    if (at === -1) return -1;
    const end = at + phrase.length;
    if (!spans.some(([s, e]) => at < e && end > s)) return at;
    from = at + 1;
  }
}

/** Envuelve `phrase` (que ya existe en el post) en un enlace; devuelve false si no hay dónde. */
function wrapPhrase(content, phrase, href) {
  for (const block of content) {
    if (block.type === "paragraph") {
      const at = findOutsideLinks(block.text, phrase);
      if (at !== -1) {
        block.text = `${block.text.slice(0, at)}[${phrase}](${href})${block.text.slice(at + phrase.length)}`;
        return true;
      }
    } else if (block.type === "list") {
      for (let i = 0; i < block.items.length; i++) {
        const at = findOutsideLinks(block.items[i], phrase);
        if (at !== -1) {
          block.items[i] = `${block.items[i].slice(0, at)}[${phrase}](${href})${block.items[i].slice(at + phrase.length)}`;
          return true;
        }
      }
    }
  }
  return false;
}

/** Agrega una frase al final del único párrafo que empieza por `blockStart`. */
function appendSentence(content, rule, href) {
  const matches = content.filter((b) => b.type === "paragraph" && b.text.startsWith(rule.block));
  if (matches.length !== 1) return { ok: false, reason: `${matches.length} párrafos empiezan por "${rule.block}" (se esperaba 1)` };
  const paragraph = matches[0];
  if (!/[.!?…][»"”'’)]*$/.test(paragraph.text)) return { ok: false, reason: `el párrafo "${rule.block}" no termina en puntuación` };
  if (!rule.append.includes("{link}")) return { ok: false, reason: `la frase de "${rule.block}" no trae {link}` };
  paragraph.text = `${paragraph.text} ${rule.append.replace("{link}", `[${rule.anchor}](${href})`)}`;
  return { ok: true };
}

/**
 * Plan de un post: devuelve el contenido nuevo (copia, no muta el original)
 * y qué se aplicó/saltó. Lanza si una regla que tocaba aplicar no encuentra
 * su frase o su párrafo.
 */
export function planPost({ slug, locale, content, rules, minInternalLinks }) {
  const next = structuredClone(content);
  const own = normalizeHref(pathFor("post", locale, slug));
  const present = internalHrefs(next);
  const applied = [];
  const skipped = [];

  for (const rule of rules) {
    const href = pathFor(rule.kind, locale, rule.slug);
    const key = normalizeHref(href);
    if (key === own) {
      skipped.push({ href, why: "es el propio post" });
      continue;
    }
    if (present.has(key)) {
      skipped.push({ href, why: "ya enlazado" });
      continue;
    }
    if (!rule.always && present.size >= minInternalLinks) {
      skipped.push({ href, why: `ya tiene ${present.size} enlaces internos` });
      continue;
    }
    const spec = rule[locale];
    if (!spec) throw new Error(`[${locale}] ${slug}: la regla hacia ${href} no trae texto para este idioma.`);

    let anchor;
    if (spec.wrap) {
      if (!wrapPhrase(next, spec.wrap, href)) throw new Error(`[${locale}] ${slug}: no se encontró la frase "${spec.wrap}" fuera de un enlace.`);
      anchor = spec.wrap;
    } else {
      const result = appendSentence(next, spec, href);
      if (!result.ok) throw new Error(`[${locale}] ${slug}: ${result.reason}.`);
      anchor = spec.anchor;
    }
    present.add(key);
    applied.push({ href, anchor });
  }

  if (present.size < minInternalLinks) {
    throw new Error(`[${locale}] ${slug}: solo llega a ${present.size} enlaces internos (mínimo ${minInternalLinks}); faltan reglas.`);
  }
  return { content: next, applied, skipped, total: present.size };
}

export function loadRules() {
  return JSON.parse(readFileSync(join(__dirname, "seed-data", "seo", "blog-internal-links.json"), "utf-8"));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
    process.exit(1);
  }

  const { default: pg } = await import("pg");
  const data = loadRules();
  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT id, slug, locale, content FROM articles WHERE status = 'published' AND deleted_at IS NULL ORDER BY slug, locale;"
    );

    const seen = new Set();
    let changed = 0;
    for (const row of rows) {
      const rules = data.posts[row.slug];
      seen.add(`${row.slug}/${row.locale}`);
      if (!rules) {
        const count = internalHrefs(row.content).size;
        if (count < data.minInternalLinks) {
          console.warn(`[${row.locale}] ${row.slug}: solo ${count} enlaces internos y no hay reglas — agrégalas en blog-internal-links.json.`);
        }
        continue;
      }
      const plan = planPost({ slug: row.slug, locale: row.locale, content: row.content, rules, minInternalLinks: data.minInternalLinks });
      if (plan.applied.length === 0) {
        console.log(`[${row.locale}] ${row.slug}: sin cambios (${plan.total} enlaces internos).`);
        continue;
      }
      // Sin `updated_at` a propósito: ver la cabecera.
      await client.query("UPDATE articles SET content = $1 WHERE id = $2;", [JSON.stringify(plan.content), row.id]);
      changed++;
      console.log(`[${row.locale}] ${row.slug}: +${plan.applied.length} (${plan.total} en total)`);
      for (const link of plan.applied) console.log(`    ${link.anchor} -> ${link.href}`);
    }

    for (const slug of Object.keys(data.posts)) {
      for (const locale of LOCALES) {
        if (!seen.has(`${slug}/${locale}`)) console.warn(`[${locale}] ${slug}: no está publicado en esta base — se salta.`);
      }
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log(`\n--dry-run: ${changed} posts se modificarían; no se escribió nada.`);
    } else {
      await client.query("COMMIT");
      console.log(`\nListo. ${changed} posts modificados.`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// Solo corre como script; importarlo (test) no toca la base.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

// Los cambios de este script no pasan por un Route Handler del sitio: se pide invalidar la caché pública.
if (!process.argv.includes("--dry-run") && !process.exitCode) await revalidatePublicSite();
