#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-legacy-guide-reframe.mjs [--dry-run]
//      (o `npm run db:seo-legacy-guide`)
//
// Script de contenido idempotente (mismo criterio que seo-legacy-migration-cluster.mjs: datos, no
// esquema). Separa las dos intenciones del clúster de migración de sistemas legados:
//
//   - /servicios/migracion-datos-legacy → COMERCIAL  ("servicios de migración de sistemas legacy")
//   - el post `migracion-sistemas-legados-sin-interrupcion` → INFORMATIVO (la guía)
//
// que en Search Console competían por la misma consulta (el post rankeaba, peor, por una búsqueda
// comercial). Para cada idioma el script:
//   1. fija título y descripción de la guía desde el MAPA DE KEYWORDS (src/seo/keyword-map.ts,
//      clúster `migracion-legacy-guia`): "Guía: cómo migrar sistemas legados sin downtime"…;
//   2. agrega, al final del primer párrafo (antes de la palabra 100), UN enlace contextual al
//      servicio con anchor comercial — la ruta sale del mismo mapa, así que vale antes y después de
//      localizar los slugs;
//   3. quita del cuerpo el anchor comercial duplicado ("servicio de migración de sistemas legacy"):
//      la frase comercial queda solo en ese enlace de la apertura y en la página del servicio.
//
// Funciona con la columna `translation_key` (migración 0045) o, si aún no existe, con el slug.
// Edita filas YA publicadas a propósito (`updateArticleContent()` solo acepta borradores) y toca
// `updated_at` (dateModified del JSON-LD), nunca `published_at`. Todo en una transacción.

import { Pool } from "pg";
import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";

const { KEYWORD_MAP } = await import("../src/seo/keyword-map.ts");

const dryRun = process.argv.includes("--dry-run");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const GUIDE_KEY = "migracion-sistemas-legados-sin-interrupcion";
const MAX_WORDS_BEFORE_LINK = 100;

/** Frase comercial con enlace que se inserta en la apertura de la guía (por idioma). */
function openingSentence(locale, servicePath) {
  switch (locale) {
    case "es":
      return `Si prefiere delegar el proyecto, conozca nuestros [servicios de migración de sistemas legacy](${servicePath}); si quiere entender el proceso primero, esta guía lo recorre paso a paso.`;
    case "en":
      return `If you would rather hand the project to a specialist, see our [legacy software migration services](${servicePath}); if you want to understand the process first, this guide walks through it step by step.`;
    default:
      return `Si vous préférez confier le projet à des spécialistes, découvrez notre service de [migration système legacy](${servicePath}) ; si vous voulez d'abord comprendre le processus, ce guide le détaille étape par étape.`;
  }
}

/** Reescrituras del anchor comercial repetido en el cuerpo: [patrón del texto viejo, texto nuevo]. */
const BODY_REWRITES = {
  es: [[/un \[servicio de migración de sistemas legacy\]\(([^)]+)\) bien planteado/g, "una [migración por fases]($1) bien planteada"]],
  en: [[/a well-run \[legacy software migration service\]\(([^)]+)\)/g, "a well-run [phased migration]($1)"]],
  fr: [[/un \[service de migration de systèmes legacy\]\(([^)]+)\) bien mené/g, "une [migration par étapes]($1) bien menée"]],
};

const wordsBeforeFirstLink = (text) => {
  const idx = text.indexOf("](");
  const open = idx === -1 ? -1 : text.lastIndexOf("[", idx);
  return open === -1 ? Infinity : text.slice(0, open).trim().split(/\s+/).length;
};

function rewriteBlocks(content, locale, servicePath) {
  const blocks = structuredClone(content);
  const notes = [];

  // 2) enlace comercial en la apertura (idempotente: si ya hay un enlace al servicio dentro de las primeras 100 palabras, no se toca).
  const first = blocks[0];
  if (first?.type !== "paragraph") throw new Error(`[${locale}] el primer bloque no es un párrafo — revísalo a mano.`);
  if (!(first.text.includes(`](${servicePath})`) && wordsBeforeFirstLink(first.text) < MAX_WORDS_BEFORE_LINK)) {
    first.text = `${first.text.trim()} ${openingSentence(locale, servicePath)}`;
    if (wordsBeforeFirstLink(first.text) >= MAX_WORDS_BEFORE_LINK) {
      throw new Error(`[${locale}] el enlace quedaría después de la palabra ${MAX_WORDS_BEFORE_LINK}.`);
    }
    notes.push("enlace comercial en la apertura");
  }

  // 3) anchor comercial duplicado en el cuerpo.
  blocks.forEach((block, index) => {
    if (index === 0 || block.type !== "paragraph") return;
    let text = block.text;
    for (const [pattern, replacement] of BODY_REWRITES[locale]) text = text.replace(pattern, replacement);
    if (text !== block.text) {
      block.text = text;
      notes.push(`anchor comercial reescrito (bloque ${index})`);
    }
  });

  return { blocks, notes };
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const hasKey = (
    await client.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'translation_key';")
  ).rowCount > 0;

  for (const locale of ["es", "en", "fr"]) {
    const guide = KEYWORD_MAP["migracion-legacy-guia"][locale];
    const servicePath = KEYWORD_MAP["migracion-datos-legacy"][locale].targetPath;

    const res = await client.query(
      hasKey
        ? "SELECT id, slug, title, description, content FROM articles WHERE translation_key = $1 AND locale = $2 AND deleted_at IS NULL;"
        : "SELECT id, slug, title, description, content FROM articles WHERE slug = $1 AND locale = $2 AND deleted_at IS NULL;",
      [GUIDE_KEY, locale]
    );
    const row = res.rows[0];
    if (!row) throw new Error(`[${locale}] No existe la guía ${GUIDE_KEY}.`);

    const { blocks, notes } = rewriteBlocks(row.content, locale, servicePath);
    const metaChanged = row.title !== guide.title || row.description !== guide.description;
    if (metaChanged) notes.push("título y descripción");

    if (notes.length === 0) {
      console.log(`[${locale}] ${row.slug}: ya reencuadrada — se salta.`);
      continue;
    }
    await client.query("UPDATE articles SET title = $1, description = $2, content = $3, updated_at = now() WHERE id = $4;", [
      guide.title,
      guide.description,
      JSON.stringify(blocks),
      row.id,
    ]);
    console.log(`[${locale}] ${row.slug}: ${notes.join(", ")}.`);
    console.log(`        título: ${guide.title}`);
  }

  if (dryRun) {
    await client.query("ROLLBACK");
    console.log("\n(--dry-run: no se escribió nada.)");
  } else {
    await client.query("COMMIT");
    console.log("\nListo.");
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

// Los cambios no pasan por un Route Handler del sitio: se pide invalidar la caché pública (nunca desde una base local).
const isLocalDatabase = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
if (!dryRun && !process.exitCode && !isLocalDatabase) await revalidatePublicSite();
