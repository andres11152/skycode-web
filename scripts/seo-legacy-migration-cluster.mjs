#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-legacy-migration-cluster.mjs
//      (o `npm run db:seo-legacy-cluster`)
//
// Script de contenido de una sola vez (mismo criterio que
// seed-articles-from-json.mjs: datos, no esquema). Amplía el cluster de
// "migración de sistemas legados" en los 3 idiomas, con el contenido de
// scripts/seed-data/seo/legacy-migration-cluster.json:
//
// - El post `migracion-sistemas-legados-sin-interrupcion`: título y meta
//   description nuevos (≤42 caracteres de título, porque el layout raíz
//   agrega " | SkyCode Agency"), secciones nuevas (qué es un sistema
//   legado, migrar vs. mantener, marco paso a paso, errores comunes, cómo
//   dar de baja un sistema sin migrar todos sus datos, ejemplo ilustrativo,
//   FAQ con bloque `faq` → JSON-LD FAQPage) y enlaces internos hacia
//   /servicios/migracion-datos-legacy.
// - Los posts `deuda-tecnica-como-detectarla` y `buenas-practicas-apis-rest`:
//   un párrafo con enlace contextual al servicio (y al post, en el primero).
//
// Edita filas YA publicadas a propósito (`updateArticleContent()` solo
// acepta borradores): despublicar → editar → republicar en el dashboard
// sería lo mismo con 9 pasos manuales y una ventana con el post caído.
// Actualiza `updated_at` (dateModified del JSON-LD), nunca `published_at`.
//
// Idempotente: un post que ya enlaza al servicio se salta. Las posiciones
// de inserción (LAYOUT, distintas por idioma) se validan contra la
// estructura del post original antes de tocar nada; si no calza (alguien lo
// editó a mano), aborta sin escribir — todo va en una sola transacción.
//
// Las páginas usan ISR (`revalidate = 3600`): el cambio se ve como mucho
// una hora después, o al instante tras el siguiente deploy.

import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const data = JSON.parse(readFileSync(join(__dirname, "seed-data", "seo", "legacy-migration-cluster.json"), "utf-8"));
const POST_SLUG = "migracion-sistemas-legados-sin-interrupcion";
const SERVICE_PATH = "servicios/migracion-datos-legacy";

const linksToService = (content) => JSON.stringify(content).includes(SERVICE_PATH);

// Posiciones de inserción por idioma: la versión en español del post
// original tiene 23 bloques (con una sección "Señales de que la migración
// está lista para cerrar"); las de inglés y francés, 21 y otro orden.
// strategy = h2 "Estrategia para una migración segura" (le sigue su lista),
// grace = párrafo del período de gracia, closing = párrafo de cierre.
const LAYOUT = {
  es: { length: 23, strangler: 3, strategy: 15, grace: 19, closing: 22 },
  en: { length: 21, strangler: 3, strategy: 9, grace: 17, closing: 20 },
  fr: { length: 21, strangler: 3, strategy: 9, grace: 17, closing: 20 },
};

/** Valida que los puntos de inserción sigan donde se esperan (nadie editó el post a mano desde entonces). */
function assertOriginalShape(content, locale) {
  const l = LAYOUT[locale];
  const ok =
    content.length === l.length &&
    content[0]?.type === "paragraph" &&
    content[l.strangler]?.type === "heading" &&
    content[l.strategy]?.type === "heading" &&
    content[l.strategy + 1]?.type === "list" &&
    content[l.grace]?.type === "paragraph" &&
    content[l.closing]?.type === "paragraph" &&
    l.closing === content.length - 1;
  if (!ok) throw new Error(`[${locale}] El post no tiene la estructura original esperada — revísalo a mano antes de aplicar.`);
}

function expandPost(content, d, locale) {
  const l = LAYOUT[locale];
  return [
    content[0],
    ...d.afterIntro,
    ...content.slice(1, l.strangler),
    ...d.beforeStrangler,
    ...content.slice(l.strangler, l.strategy),
    ...d.beforeStrategy,
    content[l.strategy],
    content[l.strategy + 1],
    ...d.afterStrategy,
    ...content.slice(l.strategy + 2, l.grace + 1),
    ...d.afterGrace,
    ...content.slice(l.grace + 1, l.closing),
    ...d.beforeClosing,
    content[l.closing],
    ...d.afterClosing,
  ];
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");

  for (const [locale, d] of Object.entries(data)) {
    const post = await client.query(
      "SELECT id, content FROM articles WHERE slug = $1 AND locale = $2 AND deleted_at IS NULL;",
      [POST_SLUG, locale]
    );
    const row = post.rows[0];
    if (!row) throw new Error(`[${locale}] No existe el post ${POST_SLUG}.`);

    if (linksToService(row.content)) {
      console.log(`[${locale}] ${POST_SLUG} ya ampliado — se salta.`);
    } else {
      assertOriginalShape(row.content, locale);
      const content = expandPost(row.content, d, locale);
      await client.query(
        "UPDATE articles SET title = $1, description = $2, content = $3, updated_at = now() WHERE id = $4;",
        [d.title, d.description, JSON.stringify(content), row.id]
      );
      console.log(`[${locale}] ${POST_SLUG}: ${row.content.length} → ${content.length} bloques.`);
    }

    for (const [slug, { afterIndex, block }] of Object.entries(d.others)) {
      const other = await client.query(
        "SELECT id, content FROM articles WHERE slug = $1 AND locale = $2 AND deleted_at IS NULL;",
        [slug, locale]
      );
      const otherRow = other.rows[0];
      if (!otherRow) throw new Error(`[${locale}] No existe el post ${slug}.`);
      if (linksToService(otherRow.content)) {
        console.log(`[${locale}] ${slug} ya enlaza al servicio — se salta.`);
        continue;
      }
      if (otherRow.content[afterIndex]?.type !== "paragraph") {
        throw new Error(`[${locale}] ${slug}: el bloque ${afterIndex} no es un párrafo — revísalo a mano.`);
      }
      const content = [...otherRow.content.slice(0, afterIndex + 1), block, ...otherRow.content.slice(afterIndex + 1)];
      await client.query("UPDATE articles SET content = $1, updated_at = now() WHERE id = $2;", [
        JSON.stringify(content),
        otherRow.id,
      ]);
      console.log(`[${locale}] ${slug}: enlace al servicio agregado.`);
    }
  }

  await client.query("COMMIT");
  console.log("\nListo.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
