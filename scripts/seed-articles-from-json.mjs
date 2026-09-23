#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seed-articles-from-json.mjs
//
// Migración única: lee los `posts` que hasta la Fase 3 del plan de SEO
// vivían en content/locales/{es,en,fr}/blog.json (archivados tal cual en
// scripts/seed-data/articles/{locale}.json, ver ese directorio — el JSON
// que sí sirve el sitio hoy ya no trae `posts`, solo `meta`, para no
// empaquetar ~9.000 palabras muertas por idioma en el bundle) y los
// inserta en la tabla `articles` (db/migrations/0019_articles.sql) como
// status='published', preservando su `publishedAt`/`updatedAt` original —
// el sitio público deja de leer el JSON de contenido después de correr
// esto (ver content/blog.ts).
//
// Idempotente vía `ON CONFLICT (slug, locale) DO NOTHING`: correrlo dos
// veces no duplica nada. Pensado para correr UNA vez por entorno (local,
// luego producción) al desplegar la Fase 3 — no es parte del flujo de
// migraciones normal (scripts/migrate.mjs), porque migra datos de
// aplicación, no esquema.
//
// Requiere que la migración 0019 ya haya corrido (`npm run db:migrate`) y
// que exista al menos un usuario admin (created_by/approved_by quedan NULL
// si no se pasa uno — son opcionales en el esquema).

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

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

const LOCALES = ["es", "en", "fr"];

function loadPosts(locale) {
  const path = join(__dirname, "seed-data", "articles", `${locale}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return Array.isArray(raw.posts) ? raw.posts : [];
}

try {
  // El usuario admin sembrado más antiguo, si existe, para no dejar
  // approved_by/created_by en NULL sin necesidad — es solo atribución
  // histórica ("¿quién aprobó esto?"), no afecta nada funcional si no hay
  // ninguno todavía.
  const adminRes = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id ASC LIMIT 1;`
  );
  const adminId = adminRes.rows[0]?.id ?? null;

  let inserted = 0;
  let skipped = 0;

  for (const locale of LOCALES) {
    const posts = loadPosts(locale);
    for (const post of posts) {
      const res = await pool.query(
        `INSERT INTO articles
           (slug, locale, status, title, description, author, author_slug, tags, content,
            published_at, created_by, approved_by, approved_at, created_at, updated_at)
         VALUES ($1, $2, 'published', $3, $4, $5, $6, $7, $8, $9, $10, $10, $9, $9, $11)
         ON CONFLICT (slug, locale) DO NOTHING
         RETURNING id;`,
        [
          post.slug,
          locale,
          post.title,
          post.description,
          post.author,
          post.authorSlug ?? post.author_slug ?? "",
          post.tags ?? [],
          JSON.stringify(post.content ?? []),
          post.publishedAt,
          adminId,
          post.updatedAt ?? post.publishedAt,
        ]
      );
      if (res.rows.length > 0) inserted += 1;
      else skipped += 1;
    }
  }

  console.log(`\n✅ Seed de artículos completo. Insertados: ${inserted}. Ya existían (sin tocar): ${skipped}.\n`);
} finally {
  await pool.end();
}
