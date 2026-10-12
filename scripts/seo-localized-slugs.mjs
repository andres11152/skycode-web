#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-localized-slugs.mjs [--dry-run]
//      (o `npm run db:seo-localized-slugs`)
//
// Script de contenido idempotente (mismo criterio que seo-legacy-migration-cluster.mjs: datos, no
// esquema). Completa en Postgres la localización de slugs de la fase 3 del programa de SEO:
//
//   1. Renombra el slug de las filas de `articles` en inglés y francés al slug nativo de su idioma
//      (`/en/blog/legacy-system-migration-without-downtime`…), según src/seo/slugs.ts. Hasta que se
//      corra, el sitio ya sirve esas URLs: el código busca la fila con el slug histórico O el nuevo
//      (`postSlugCandidates`), así que este script NO es un paso obligatorio del despliegue; solo
//      deja el dashboard mostrando el slug que de verdad se publica.
//   2. Reescribe los enlaces internos `[texto](/ruta)` de TODOS los artículos (también borradores) a
//      su forma final: slugs nativos de servicios y posts y, en inglés/francés, los enlaces que
//      quedaron sin prefijo de idioma (un `/portafolio` dentro de un post en inglés). Así ningún
//      enlace interno pasa por un 301.
//
// Orden indiferente respecto del despliegue, y seguro de repetir: lo que ya está en su forma final se
// salta. No toca `updated_at` (mover el slug o un enlace no cambia lo que dice el artículo ni su
// `dateModified`). Todo en una transacción; `--dry-run` imprime el plan y revierte.

import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";
import { BLOG_POST_SLUGS, localizeInternalHref, publicPostSlug } from "../src/seo/slugs.ts";

const dryRun = process.argv.includes("--dry-run");

const LINK_PATTERN = /\[([^\]\n]+)\]\((\/[^)\s]*)\)/g;

/** Reescribe los enlaces internos de un texto; devuelve el texto nuevo y cuántos cambió. */
export function rewriteLinks(text, locale) {
  let changed = 0;
  const out = text.replace(LINK_PATTERN, (whole, label, href) => {
    const next = localizeInternalHref(href, locale);
    if (next === href) return whole;
    changed += 1;
    return `[${label}](${next})`;
  });
  return { text: out, changed };
}

/** Aplica `rewriteLinks` a los bloques que admiten enlaces (párrafo, lista, respuestas de FAQ). */
export function rewriteBlocks(content, locale) {
  const blocks = structuredClone(content);
  let changed = 0;
  const apply = (text) => {
    const result = rewriteLinks(text, locale);
    changed += result.changed;
    return result.text;
  };
  for (const block of blocks) {
    if (block.type === "paragraph") block.text = apply(block.text);
    else if (block.type === "list") block.items = block.items.map(apply);
    else if (block.type === "faq") block.items = block.items.map((item) => ({ ...item, answer: apply(item.answer) }));
  }
  return { blocks, changed };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  let touched = 0;

  try {
    await client.query("BEGIN");
    const rows = (
      await client.query("SELECT id, slug, locale, content FROM articles WHERE deleted_at IS NULL ORDER BY locale, slug;")
    ).rows;

    for (const row of rows) {
      const notes = [];

      // 1) slug nativo (solo posts conocidos en inglés/francés cuya fila aún guarda el slug histórico)
      let newSlug = row.slug;
      if (row.locale !== "es" && Object.hasOwn(BLOG_POST_SLUGS, row.slug)) {
        newSlug = publicPostSlug(row.slug, row.locale);
        if (newSlug !== row.slug) {
          const clash = await client.query("SELECT 1 FROM articles WHERE slug = $1 AND locale = $2 AND id <> $3;", [newSlug, row.locale, row.id]);
          if (clash.rowCount > 0) throw new Error(`[${row.locale}] ya existe otra fila con el slug ${newSlug}; revísalo a mano.`);
          notes.push(`slug ${row.slug} → ${newSlug}`);
        }
      }

      // 2) enlaces internos
      const { blocks, changed } = rewriteBlocks(row.content, row.locale);
      if (changed > 0) notes.push(`${changed} enlace(s) interno(s)`);

      if (notes.length === 0) continue;
      await client.query("UPDATE articles SET slug = $1, content = $2 WHERE id = $3;", [newSlug, JSON.stringify(blocks), row.id]);
      touched += 1;
      console.log(`[${row.locale}] ${row.slug}: ${notes.join(", ")}.`);
    }

    if (touched === 0) console.log("Nada que cambiar: los slugs y los enlaces ya están en su forma final.");
    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("\n(--dry-run: no se escribió nada.)");
    } else {
      await client.query("COMMIT");
      console.log(`\nListo. Filas modificadas: ${touched}.`);
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

// `rewriteLinks`/`rewriteBlocks` son puras y se importan en los tests: solo se ejecuta como script.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
  // Los cambios no pasan por un Route Handler del sitio: se pide invalidar la caché pública
  // (revalidatePublicSite no hace nada si la base es local).
  if (!dryRun && !process.exitCode) await revalidatePublicSite();
}
