#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/migrate-portfolio-projects.mjs
//
// Migración única (Fase 6 del plan de portafolio enterprise, ver
// CLAUDE.md): migra los 5 casos que hasta la Fase 5 vivían en
// content/locales/{es,en,fr}/projects.json (archivados tal cual en
// scripts/seed-data/portfolio/{locale}.json — el JSON que sirve el sitio
// hoy ya no trae `items`, solo el copy de sección, ver content/projects.ts)
// a las tablas nuevas de Postgres (portfolio_projects y compañía, migración
// 0034). Sube además cada imagen real (`public/projects/**/*.webp`) al
// bucket público de R2 vía el mismo pipeline de `lib/portfolioStorage.ts`
// (3 variantes WebP), reemplicado acá en JS plano porque este script corre
// fuera de Next/TypeScript (mismo motivo que el resto de scripts/*.mjs).
//
// Idempotente por slug: si un proyecto con ese slug ya existe, el script lo
// SALTA por completo (no reinserta imágenes ni actualiza campos) — pensado
// para correr una vez por entorno; si hay que corregir algo después, se
// edita desde /dashboard/portafolio, no volviendo a correr esto.
//
// El `description` original se copia tal cual a `summary` — `challenge`/
// `solution`/`results` quedan vacíos (el JSON viejo nunca tuvo esos tres
// campos por separado, ver la nota en CLAUDE.md sobre la Fase 6) y se
// completan editorialmente desde el panel más adelante; el estado de
// publicación no lo exige (`setPortfolioProjectStatus()` solo pide
// portada + título/resumen en español).
//
// Requiere que la migración 0034 ya haya corrido (`npm run db:migrate`) y
// las 4 variables R2_PORTFOLIO_* + R2_ACCOUNT_ID en el entorno (ver
// .env.example) — sin ellas, sube cero imágenes y aborta antes de tocar
// la base de datos, para no dejar proyectos publicados sin portada.

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

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_PORTFOLIO_BUCKET_NAME = process.env.R2_PORTFOLIO_BUCKET_NAME;
const R2_PORTFOLIO_ACCESS_KEY_ID = process.env.R2_PORTFOLIO_ACCESS_KEY_ID;
const R2_PORTFOLIO_SECRET_ACCESS_KEY = process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY;
const R2_PORTFOLIO_PUBLIC_BASE_URL = process.env.R2_PORTFOLIO_PUBLIC_BASE_URL;
const R2_PORTFOLIO_ENDPOINT = process.env.R2_PORTFOLIO_ENDPOINT;

const portfolioEndpoint = R2_PORTFOLIO_ENDPOINT ?? (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
if (!portfolioEndpoint || !R2_PORTFOLIO_ACCESS_KEY_ID || !R2_PORTFOLIO_SECRET_ACCESS_KEY || !R2_PORTFOLIO_BUCKET_NAME || !R2_PORTFOLIO_PUBLIC_BASE_URL) {
  console.error(
    "Storage de imágenes del portafolio (Cloudflare R2) no configurado. Defina R2_ACCOUNT_ID, R2_PORTFOLIO_ACCESS_KEY_ID, R2_PORTFOLIO_SECRET_ACCESS_KEY, R2_PORTFOLIO_BUCKET_NAME y R2_PORTFOLIO_PUBLIC_BASE_URL en .env.local antes de correr esta migración."
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: portfolioEndpoint,
  forcePathStyle: Boolean(R2_PORTFOLIO_ENDPOINT),
  credentials: { accessKeyId: R2_PORTFOLIO_ACCESS_KEY_ID, secretAccessKey: R2_PORTFOLIO_SECRET_ACCESS_KEY },
});

const VARIANT_WIDTHS = { sm: 400, md: 800, lg: 1600 };

/** Mismo pipeline que `lib/portfolioStorage.ts::processAndUploadPortfolioImage()`, reimplementado en JS plano — ver comentario de cabecera. */
async function uploadPortfolioImage(buffer) {
  const storageKey = randomUUID();
  const variants = {};
  let width = 0;
  let height = 0;

  for (const [size, targetWidth] of Object.entries(VARIANT_WIDTHS)) {
    const { data, info } = await sharp(buffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

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
    if (size === "lg") {
      width = info.width;
      height = info.height;
    }
  }

  return { storageKey, variants, width, height };
}

const LOCALES = ["es", "en", "fr"];

function loadProjects(locale) {
  const path = join(__dirname, "seed-data", "portfolio", `${locale}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return raw.items;
}

// Catálogo de tecnologías reales usadas por estos 5 casos — el resto de
// cada `tags[]` original (capacidades de negocio, no stack técnico) se
// migra a `capabilities`, ver PROJECT_CONFIG abajo. slugs verificados
// contra node_modules/simple-icons/icons/ antes de escribir esto.
const TECHNOLOGIES = [
  { slug: "nextdotjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" },
  { slug: "postgresql", name: "PostgreSQL", category: "database", iconSource: "simple-icons", iconRef: "postgresql" },
  { slug: "nodedotjs", name: "Node.js", category: "backend", iconSource: "simple-icons", iconRef: "nodedotjs" },
  { slug: "whatsapp", name: "WhatsApp", category: "integration", iconSource: "simple-icons", iconRef: "whatsapp" },
];

// Índices de `tags[]` (mismo orden/cantidad en los 3 locales) que SÍ son
// stack técnico reconocible, mapeados al catálogo de arriba — los índices
// restantes se migran como `capabilities` (traducibles, texto de negocio).
const PROJECT_CONFIG = {
  "sentry-crm": { technologySlugs: ["whatsapp", "nextdotjs", "postgresql"], capabilityTagIndexes: [0, 2], isFeatured: true },
  servifuturo: { technologySlugs: ["nextdotjs", "nodedotjs", "postgresql"], capabilityTagIndexes: [0, 1], isFeatured: false },
  "equilibrio-arquitectonico": { technologySlugs: ["nextdotjs"], capabilityTagIndexes: [0, 1, 2], isFeatured: false },
  "cda-revifull": { technologySlugs: ["whatsapp", "nextdotjs"], capabilityTagIndexes: [0, 1], isFeatured: false },
  moncyre: { technologySlugs: ["nextdotjs"], capabilityTagIndexes: [0, 1, 2], isFeatured: false },
};

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id ASC LIMIT 1;`);
  const adminId = adminRes.rows[0]?.id ?? null;

  const esProjects = loadProjects("es");
  const projectsByLocale = { es: esProjects, en: loadProjects("en"), fr: loadProjects("fr") };

  const techIdBySlug = new Map();
  for (const tech of TECHNOLOGIES) {
    const res = await pool.query(
      `INSERT INTO portfolio_technologies (slug, name, category, icon_source, icon_ref)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      [tech.slug, tech.name, tech.category, tech.iconSource, tech.iconRef]
    );
    techIdBySlug.set(tech.slug, res.rows[0].id);
  }
  console.log(`Catálogo de tecnologías listo (${TECHNOLOGIES.length}).`);

  let migrated = 0;
  let skipped = 0;

  for (let index = 0; index < esProjects.length; index++) {
    const esItem = esProjects[index];
    const slug = esItem.slug;
    const config = PROJECT_CONFIG[slug];
    if (!config) {
      console.warn(`Sin configuración de tecnologías/capacidades para "${slug}" — se salta.`);
      continue;
    }

    const existing = await pool.query(`SELECT id FROM portfolio_projects WHERE slug = $1;`, [slug]);
    if (existing.rows.length > 0) {
      console.log(`"${slug}" ya existe — se salta (idempotente).`);
      skipped++;
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const projectRes = await client.query(
        `INSERT INTO portfolio_projects (slug, status, is_featured, sort_order, live_url, industry_icon, created_by, updated_by)
         VALUES ($1, 'draft', $2, $3, $4, $5, $6, $6) RETURNING id;`,
        [slug, config.isFeatured, index, esItem.link ?? null, esItem.iconName, adminId]
      );
      const projectId = projectRes.rows[0].id;

      for (const locale of LOCALES) {
        const item = projectsByLocale[locale].find((p) => p.slug === slug);
        const capabilities = config.capabilityTagIndexes.map((i) => item.tags[i]).filter(Boolean);
        await client.query(
          `INSERT INTO portfolio_project_translations (project_id, locale, title, client_label, summary, challenge, solution, results, capabilities)
           VALUES ($1, $2, $3, $4, $5, '', '', '', $6);`,
          [projectId, locale, item.title, item.client, item.description, capabilities]
        );
      }

      let techSortOrder = 0;
      for (const techSlug of config.technologySlugs) {
        await client.query(
          `INSERT INTO portfolio_project_technologies (project_id, technology_id, sort_order) VALUES ($1, $2, $3);`,
          [projectId, techIdBySlug.get(techSlug), techSortOrder++]
        );
      }

      // Imágenes: sube TODA la galería en orden (deduplicando por ruta
      // original), y marca como portada la que coincide con `coverImage`.
      const galleryPaths = Array.isArray(esItem.gallery) && esItem.gallery.length > 0 ? esItem.gallery : esItem.coverImage ? [esItem.coverImage] : [];
      let coverImageId = null;
      let imageSortOrder = 0;
      for (const publicPath of galleryPaths) {
        const filePath = join(REPO_ROOT, "public", publicPath.replace(/^\//, ""));
        if (!existsSync(filePath)) {
          console.warn(`  Imagen no encontrada, se salta: ${publicPath}`);
          continue;
        }
        const buffer = readFileSync(filePath);
        const { storageKey, variants, width, height } = await uploadPortfolioImage(buffer);
        const altByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, projectsByLocale[locale].find((p) => p.slug === slug).title]));
        const imageRes = await client.query(
          `INSERT INTO portfolio_project_images (project_id, storage_key, variants, width, height, alt, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`,
          [projectId, storageKey, JSON.stringify(variants), width, height, JSON.stringify(altByLocale), imageSortOrder++]
        );
        if (publicPath === esItem.coverImage) coverImageId = imageRes.rows[0].id;
        console.log(`  Subida: ${publicPath} -> ${storageKey}`);
      }
      if (!coverImageId && imageSortOrder > 0) {
        // Si por algún motivo `coverImage` no matcheó ninguna ruta de la
        // galería, usa la primera imagen subida en vez de dejar el caso
        // sin portada (bloquearía la publicación sin motivo real).
        const firstImage = await client.query(`SELECT id FROM portfolio_project_images WHERE project_id = $1 ORDER BY sort_order ASC LIMIT 1;`, [projectId]);
        coverImageId = firstImage.rows[0]?.id ?? null;
      }
      if (coverImageId) {
        await client.query(`UPDATE portfolio_projects SET cover_image_id = $1 WHERE id = $2;`, [coverImageId, projectId]);
      }

      // Publica de una vez — ya tiene portada + título/resumen en los 3
      // idiomas, y son los mismos 5 casos que ya estaban públicos en el
      // sitio antes de esta migración (no son borradores nuevos).
      await client.query(
        `UPDATE portfolio_projects SET status = 'published', published_at = now() WHERE id = $1;`,
        [projectId]
      );

      await client.query("COMMIT");
      migrated++;
      console.log(`"${slug}" migrado y publicado (${imageSortOrder} imágenes).`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(`\nListo: ${migrated} caso(s) migrado(s), ${skipped} saltado(s) por ya existir.`);
} finally {
  await pool.end();
}
