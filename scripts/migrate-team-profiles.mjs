#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/migrate-team-profiles.mjs
//      (o `npm run db:seed-team-profiles`)
//
// Migración única (Fase 5 del plan de perfiles, ver CLAUDE.md): pasa los
// miembros que hasta ahora vivían en content/locales/{es,en,fr}/team.json
// (archivados tal cual en scripts/seed-data/team/{locale}.json — el JSON que
// sirve el sitio hoy solo trae el copy de la sección) a `team_profiles` +
// `team_profile_translations` (migración 0037), y sube cada foto de
// `public/team/*.webp` al bucket público de R2 con el mismo pipeline que
// `lib/portfolioStorage.ts` (anchos 400/800/1600 conservando la proporción
// retrato — la tarjeta de /equipo es 3:4, no un avatar cuadrado).
//
// CRÍTICO — los slugs se preservan EXACTOS: cada post del blog enlaza a su
// autor como `/equipo#{author_slug}` y lo usa en el JSON-LD `Person`.
//
// Idempotente por slug: un perfil que ya existe se salta entero. Pensado
// para correr una vez por entorno; correcciones posteriores se hacen desde
// /dashboard/perfiles-publicos. Los perfiles se publican de una vez porque
// ya eran públicos antes de la migración.

import { Pool } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const {
  R2_ACCOUNT_ID,
  R2_PORTFOLIO_BUCKET_NAME,
  R2_PORTFOLIO_ACCESS_KEY_ID,
  R2_PORTFOLIO_SECRET_ACCESS_KEY,
  R2_PORTFOLIO_PUBLIC_BASE_URL,
  R2_PORTFOLIO_ENDPOINT,
} = process.env;

const endpoint = R2_PORTFOLIO_ENDPOINT ?? (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
if (!endpoint || !R2_PORTFOLIO_ACCESS_KEY_ID || !R2_PORTFOLIO_SECRET_ACCESS_KEY || !R2_PORTFOLIO_BUCKET_NAME || !R2_PORTFOLIO_PUBLIC_BASE_URL) {
  console.error("Storage público (R2_PORTFOLIO_*) no configurado — sin él no se pueden subir las fotos. Abortando antes de tocar la base.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: Boolean(R2_PORTFOLIO_ENDPOINT),
  credentials: { accessKeyId: R2_PORTFOLIO_ACCESS_KEY_ID, secretAccessKey: R2_PORTFOLIO_SECRET_ACCESS_KEY },
});

const VARIANT_WIDTHS = { sm: 400, md: 800, lg: 1600 };

/** Mismo pipeline que `lib/portfolioStorage.ts::processAndUploadPortfolioImage()`, en JS plano (este script corre fuera de Next). */
async function uploadPhoto(buffer) {
  const storageKey = randomUUID();
  const variants = {};
  for (const [size, width] of Object.entries(VARIANT_WIDTHS)) {
    const data = await sharp(buffer).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const key = `${storageKey}-${size}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_PORTFOLIO_BUCKET_NAME,
        Key: key,
        Body: data,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    variants[size] = `${R2_PORTFOLIO_PUBLIC_BASE_URL}/${key}`;
  }
  return { storageKey, variants };
}

const LOCALES = ["es", "en", "fr"];
const byLocale = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(join(__dirname, "seed-data", "team", `${l}.json`), "utf-8")).members])
);

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id ASC LIMIT 1;`);
  const adminId = adminRes.rows[0]?.id ?? null;

  let migrated = 0;
  let skipped = 0;

  for (const [index, esMember] of byLocale.es.entries()) {
    const { slug } = esMember;
    const existing = await pool.query("SELECT id FROM team_profiles WHERE slug = $1;", [slug]);
    if (existing.rows.length > 0) {
      console.log(`"${slug}" ya existe — se salta.`);
      skipped++;
      continue;
    }

    // La foto se sube ANTES de abrir la transacción: si falla, no queda
    // ningún perfil a medias en la base (como mucho, objetos huérfanos).
    let photo = null;
    if (esMember.photo) {
      const filePath = join(REPO_ROOT, "public", esMember.photo.replace(/^\//, ""));
      if (existsSync(filePath)) {
        photo = await uploadPhoto(readFileSync(filePath));
        console.log(`  Foto subida: ${esMember.photo} -> ${photo.storageKey}`);
      } else {
        console.warn(`  Foto no encontrada, el perfil queda con iniciales: ${esMember.photo}`);
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `INSERT INTO team_profiles (slug, avatar_storage_key, avatar_variants, is_published, sort_order, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $5, $5) RETURNING id;`,
        [slug, photo?.storageKey ?? null, photo ? JSON.stringify(photo.variants) : null, index, adminId]
      );
      const profileId = res.rows[0].id;

      for (const locale of LOCALES) {
        const m = byLocale[locale].find((x) => x.slug === slug);
        if (!m) continue;
        await client.query(
          `INSERT INTO team_profile_translations (profile_id, locale, name, public_role, public_bio) VALUES ($1, $2, $3, $4, $5);`,
          [profileId, locale, m.name, m.role, m.description]
        );
      }
      await client.query("COMMIT");
      migrated++;
      console.log(`"${slug}" migrado y publicado.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(`\nListo: ${migrated} perfil(es) migrado(s), ${skipped} saltado(s).`);
} finally {
  await pool.end();
}
