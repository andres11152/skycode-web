#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/portfolio-case-refresh.mjs <slug> [--dry-run]
//      (o `npm run db:portfolio-case -- <slug> [--dry-run]`)
//
// Script de contenido (datos, no esquema) que CREA o RENUEVA un caso del
// portafolio a partir de su bloque en scripts/seed-data/seo/case-studies.json
// (el mismo que lee seo-case-studies.mjs). Hoy lo usan `racingbike` y `5amgym`.
// Lo que lee del bloque del caso:
//   - es/en/fr: tarjeta (title, clientLabel, summary, capabilities) y capítulos.
//   - images + alt: capturas (en scripts/seed-data/portfolio/<imagesDir>/, fuera
//     de public/ a propósito) y su texto alternativo por idioma.
//   - metrics: cifras con etiqueta por idioma.
//   - project: liveUrl, industryIcon, featured, position (lugar en el listado,
//     0 = primero) y technologies (slugs del catálogo).
// Y del nivel raíz, `technologyCatalog`: tecnologías que se agregan al catálogo
// si faltan (ícono de simple-icons con el mismo slug, verificado a mano).
//
// Qué hace, en este orden:
//   1. Sube las capturas al bucket público del portafolio (R2_PORTFOLIO_*) con
//      el MISMO pipeline que lib/portfolioStorage.ts: variantes sm/md/lg (+ xl
//      si la fuente supera 1600 px), WebP calidad 82, difuminado de 16 px y
//      color medio en `variants`. Los números están duplicados a propósito
//      (este script corre fuera de Next/TypeScript).
//   2. En UNA transacción: crea el caso si no existe; reemplaza galería y
//      portada, textos es/en/fr, cifras y tecnologías; fija enlace, ícono y
//      destacado (si `featured`, deja de serlo cualquier otro); reordena el
//      listado para ponerlo en `position`; y lo publica (exige portada y texto
//      en español, igual que setPortfolioProjectStatus()).
//   3. Solo tras el COMMIT borra del bucket las capturas anteriores; si la
//      transacción falla, borra las recién subidas.
//   4. Invalida la caché pública (POST /api/cron/revalidate-public).
//
// Es una actualización explícita: sobrescribe lo editado en el panel (por eso
// --dry-run muestra antes qué cambia). Idempotente: si la galería ya coincide
// (mismas capturas, mismo orden, mismo alt), no vuelve a subir imágenes.
//
// Los marcadores {{TODO: …}} (resultados, plazos, testimonio) se guardan tal
// cual: la vista pública los omite (lib/todoPlaceholders.ts) y
// `npm run seo:todos` los lista para completarlos con datos reales.

import { Pool } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const SLUG = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const LOCALES = ["es", "en", "fr"];

// Mismos valores que lib/portfolioStorage.ts.
const VARIANT_WIDTHS = { sm: 400, md: 800, lg: 1600 };
const XL_WIDTH = 2400;
const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_QUALITY = 40;

// campo del JSON -> columna de portfolio_project_translations. Lista cerrada:
// nada del JSON llega al SQL como identificador.
const COLUMNS = {
  title: "title",
  clientLabel: "client_label",
  summary: "summary",
  clientContext: "client_context",
  challenge: "challenge",
  solution: "solution",
  architecture: "architecture",
  process: "process",
  results: "results",
  testimonialQuote: "testimonial_quote",
  testimonialAuthor: "testimonial_author",
  testimonialRole: "testimonial_role",
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!SLUG || !/^[a-z0-9-]+$/.test(SLUG)) fail("Uso: portfolio-case-refresh.mjs <slug> [--dry-run]");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");

const data = JSON.parse(readFileSync(join(__dirname, "seed-data", "seo", "case-studies.json"), "utf-8"));
const entry = data.projects[SLUG];
if (!entry?.images?.length || !entry.imagesDir || !entry.project) {
  fail(`case-studies.json no tiene el bloque "${SLUG}" con "images", "imagesDir" y "project".`);
}
const IMAGES_DIR = join(__dirname, "seed-data", "portfolio", entry.imagesDir);
for (const locale of LOCALES) {
  if (!entry[locale]?.title || !entry[locale]?.summary) fail(`Falta título o resumen en "${locale}".`);
  if (entry.alt?.[locale]?.length !== entry.images.length) fail(`El alt en "${locale}" no tiene una entrada por captura (${entry.images.length}).`);
}
for (const file of entry.images) {
  if (!existsSync(join(IMAGES_DIR, file))) fail(`No existe la captura ${file} en ${IMAGES_DIR}.`);
}
const catalogBySlug = new Map((data.technologyCatalog ?? []).map((tech) => [tech.slug, tech]));

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

function bucket() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_PORTFOLIO_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const name = process.env.R2_PORTFOLIO_BUCKET_NAME;
  const publicBase = process.env.R2_PORTFOLIO_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const accessKeyId = process.env.R2_PORTFOLIO_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY;
  if (!endpoint || !name || !publicBase || !accessKeyId || !secretAccessKey) {
    fail("Storage del portafolio no configurado: faltan R2_ACCOUNT_ID / R2_PORTFOLIO_* en el entorno.");
  }
  const client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: Boolean(process.env.R2_PORTFOLIO_ENDPOINT),
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, name, publicBase };
}

async function uploadImage(store, buffer) {
  const storageKey = randomUUID();
  const metadata = await sharp(buffer).metadata();
  const targets = Object.entries(VARIANT_WIDTHS);
  if ((metadata.width ?? 0) > VARIANT_WIDTHS.lg) targets.push(["xl", XL_WIDTH]);

  const variants = {};
  let width = 0;
  let height = 0;
  for (const [size, targetWidth] of targets) {
    const { data: body, info } = await sharp(buffer)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const key = `${storageKey}-${size}.webp`;
    await store.client.send(
      new PutObjectCommand({
        Bucket: store.name,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    variants[size] = `${store.publicBase}/${key}`;
    if (size === "lg") {
      width = info.width;
      height = info.height;
    }
  }

  const [tiny, pixel] = await Promise.all([
    sharp(buffer).rotate().resize({ width: PLACEHOLDER_WIDTH }).webp({ quality: PLACEHOLDER_QUALITY }).toBuffer(),
    sharp(buffer).rotate().resize(1, 1, { fit: "cover" }).removeAlpha().raw().toBuffer(),
  ]);
  variants.blur = `data:image/webp;base64,${tiny.toString("base64")}`;
  variants.color = `#${[pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

  return { storageKey, variants, width, height };
}

async function deleteImageFiles(store, storageKeys) {
  for (const storageKey of storageKeys) {
    await Promise.all(
      [...Object.keys(VARIANT_WIDTHS), "xl"].map((size) =>
        store.client
          .send(new DeleteObjectCommand({ Bucket: store.name, Key: `${storageKey}-${size}.webp` }))
          .catch((error) => console.warn(`  No se pudo borrar ${storageKey}-${size}.webp: ${error.message}`))
      )
    );
  }
}

function preview(value) {
  const text = Array.isArray(value) ? value.join(" · ") : String(value ?? "");
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 87)}…` : flat || "(vacío)";
}

const client = await pool.connect();
let uploaded = [];
let store = null;
try {
  const projectRes = await client.query(
    "SELECT id, is_featured, status, live_url, industry_icon FROM portfolio_projects WHERE slug = $1 AND deleted_at IS NULL;",
    [SLUG]
  );
  const existing = projectRes.rows[0] ?? null;
  const projectId = existing?.id ?? null;

  const translations = new Map(
    projectId
      ? (await client.query("SELECT * FROM portfolio_project_translations WHERE project_id = $1;", [projectId])).rows.map((row) => [row.locale, row])
      : []
  );
  const oldImages = projectId
    ? (await client.query("SELECT id, storage_key, alt FROM portfolio_project_images WHERE project_id = $1 ORDER BY sort_order ASC, id ASC;", [projectId])).rows
    : [];
  const currentTech = projectId
    ? (
        await client.query(
          `SELECT t.slug FROM portfolio_project_technologies pt JOIN portfolio_technologies t ON t.id = pt.technology_id
           WHERE pt.project_id = $1 ORDER BY pt.sort_order ASC;`,
          [projectId]
        )
      ).rows.map((row) => row.slug)
    : [];
  const knownTech = new Set(
    (await client.query("SELECT slug FROM portfolio_technologies WHERE slug = ANY($1::text[]);", [entry.project.technologies])).rows.map((row) => row.slug)
  );
  const missingTech = entry.project.technologies.filter((slug) => !knownTech.has(slug));
  const unresolvable = missingTech.filter((slug) => !catalogBySlug.has(slug));
  if (unresolvable.length) fail(`Tecnologías sin catálogo ni definición en technologyCatalog: ${unresolvable.join(", ")}`);
  for (const slug of missingTech) {
    if (!existsSync(join(__dirname, "..", "node_modules", "simple-icons", "icons", `${slug}.svg`))) fail(`simple-icons no tiene el ícono "${slug}".`);
  }

  const featuredOthers = entry.project.featured
    ? (await client.query("SELECT slug FROM portfolio_projects WHERE is_featured AND slug <> $1 AND deleted_at IS NULL;", [SLUG])).rows.map((row) => row.slug)
    : [];
  const order = (await client.query("SELECT id, slug FROM portfolio_projects WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC;")).rows;
  const others = order.filter((row) => row.slug !== SLUG);
  const position = Math.max(0, Math.min(entry.project.position ?? others.length, others.length));
  const newOrder = [...others.slice(0, position).map((row) => row.slug), SLUG, ...others.slice(position).map((row) => row.slug)];

  const galleryUpToDate =
    oldImages.length === entry.images.length && oldImages.every((image, i) => (image.alt?.es ?? "") === entry.alt.es[i]);

  console.log(`Caso "${SLUG}"${projectId ? ` (id ${projectId})` : " (NUEVO)"}${DRY_RUN ? " — SIMULACIÓN, no se escribe nada" : ""}\n`);
  for (const locale of LOCALES) {
    const current = translations.get(locale) ?? {};
    console.log(`[${locale}]${translations.has(locale) ? "" : " (traducción nueva)"}`);
    for (const [field, column] of Object.entries(COLUMNS)) {
      const next = entry[locale][field] ?? null;
      if ((current[column] ?? null) === next) continue;
      console.log(`  ${column}: ${preview(current[column])}\n  ${" ".repeat(column.length)}→ ${preview(next)}`);
    }
    if (JSON.stringify(current.capabilities ?? []) !== JSON.stringify(entry[locale].capabilities)) {
      console.log(`  capabilities: ${preview(current.capabilities ?? [])}\n                → ${preview(entry[locale].capabilities)}`);
    }
  }
  console.log(
    `\nGalería: ${galleryUpToDate ? "ya al día, no se suben imágenes" : `${oldImages.length} capturas → ${entry.images.length} nuevas (${entry.images.join(", ")})`}`
  );
  console.log(`Cifras: ${entry.metrics.map((m) => `${m.value} ${m.label.es}`).join(" | ")}`);
  console.log(`Tecnologías: ${currentTech.join(", ") || "(ninguna)"} → ${entry.project.technologies.join(", ")}`);
  if (missingTech.length) console.log(`  Se agregan al catálogo: ${missingTech.join(", ")}`);
  console.log(`Enlace: ${existing?.live_url ?? "(ninguno)"} → ${entry.project.liveUrl}`);
  console.log(`Orden del listado: ${newOrder.join(" → ")}`);
  console.log(
    entry.project.featured
      ? `Destacado: ${existing?.is_featured ? "ya lo era" : "pasa a destacado"}${featuredOthers.length ? `; deja de serlo: ${featuredOthers.join(", ")}` : ""}`
      : `Destacado: no${existing?.is_featured ? " (deja de serlo)" : ""}`
  );
  console.log(`Estado: ${existing?.status ?? "nuevo"} → published`);

  if (DRY_RUN) {
    console.log("\nSimulación terminada. Corre sin --dry-run para aplicar.");
  } else {
    if (!galleryUpToDate) {
      store = bucket();
      for (const file of entry.images) {
        const result = await uploadImage(store, readFileSync(join(IMAGES_DIR, file)));
        uploaded.push(result);
        console.log(`  Subida ${file} (${result.width}×${result.height}${result.variants.xl ? ", con xl" : ""})`);
      }
    }

    await client.query("BEGIN");

    const adminId = (await client.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id ASC LIMIT 1;")).rows[0]?.id ?? null;
    let id = projectId;
    if (!id) {
      id = (
        await client.query(
          `INSERT INTO portfolio_projects (slug, status, is_featured, sort_order, live_url, industry_icon, created_by, updated_by)
           VALUES ($1, 'draft', false, $2, $3, $4, $5, $5) RETURNING id;`,
          [SLUG, position, entry.project.liveUrl, entry.project.industryIcon, adminId]
        )
      ).rows[0].id;
    }

    if (!galleryUpToDate) {
      await client.query("UPDATE portfolio_projects SET cover_image_id = NULL WHERE id = $1;", [id]);
      await client.query("DELETE FROM portfolio_project_images WHERE project_id = $1;", [id]);
      let coverId = null;
      for (let i = 0; i < uploaded.length; i++) {
        const image = uploaded[i];
        const alt = Object.fromEntries(LOCALES.map((locale) => [locale, entry.alt[locale][i]]));
        const res = await client.query(
          `INSERT INTO portfolio_project_images (project_id, storage_key, variants, width, height, alt, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`,
          [id, image.storageKey, JSON.stringify(image.variants), image.width, image.height, JSON.stringify(alt), i]
        );
        if (i === 0) coverId = res.rows[0].id;
      }
      await client.query("UPDATE portfolio_projects SET cover_image_id = $1 WHERE id = $2;", [coverId, id]);
    }

    for (const locale of LOCALES) {
      const values = Object.keys(COLUMNS).map((field) => entry[locale][field] ?? null);
      const columns = Object.values(COLUMNS);
      await client.query(
        `INSERT INTO portfolio_project_translations (project_id, locale, ${columns.join(", ")}, capabilities)
         VALUES ($1, $2, ${columns.map((_, i) => `$${i + 3}`).join(", ")}, $${columns.length + 3})
         ON CONFLICT (project_id, locale) DO UPDATE SET
           ${columns.map((column) => `${column} = EXCLUDED.${column}`).join(",\n           ")},
           capabilities = EXCLUDED.capabilities;`,
        [id, locale, ...values, entry[locale].capabilities]
      );
    }

    await client.query("DELETE FROM portfolio_project_metrics WHERE project_id = $1;", [id]);
    for (let i = 0; i < entry.metrics.length; i++) {
      const metric = entry.metrics[i];
      await client.query("INSERT INTO portfolio_project_metrics (project_id, value, label, sort_order) VALUES ($1, $2, $3, $4);", [
        id,
        metric.value,
        JSON.stringify(metric.label),
        i,
      ]);
    }

    for (const slug of missingTech) {
      const tech = catalogBySlug.get(slug);
      await client.query(
        `INSERT INTO portfolio_technologies (slug, name, category, icon_source, icon_ref)
         VALUES ($1, $2, $3, 'simple-icons', $1) ON CONFLICT (slug) DO NOTHING;`,
        [tech.slug, tech.name, tech.category]
      );
    }
    await client.query("DELETE FROM portfolio_project_technologies WHERE project_id = $1;", [id]);
    await client.query(
      `INSERT INTO portfolio_project_technologies (project_id, technology_id, sort_order)
       SELECT $1, t.id, s.ord - 1 FROM unnest($2::text[]) WITH ORDINALITY AS s(slug, ord)
       JOIN portfolio_technologies t ON t.slug = s.slug;`,
      [id, entry.project.technologies]
    );

    if (entry.project.featured) {
      await client.query("UPDATE portfolio_projects SET is_featured = false, updated_at = now() WHERE is_featured AND id <> $1;", [id]);
    }
    await client.query(
      `UPDATE portfolio_projects SET live_url = $1, industry_icon = $2, is_featured = $3, updated_by = COALESCE($4, updated_by), updated_at = now()
       WHERE id = $5;`,
      [entry.project.liveUrl, entry.project.industryIcon, Boolean(entry.project.featured), adminId, id]
    );
    await client.query(
      `UPDATE portfolio_projects p SET sort_order = s.ord - 1
       FROM unnest($1::text[]) WITH ORDINALITY AS s(slug, ord)
       WHERE p.slug = s.slug AND p.deleted_at IS NULL;`,
      [newOrder]
    );

    // Mismas condiciones que setPortfolioProjectStatus(): portada + título y resumen en español.
    const ready = await client.query(
      `SELECT p.cover_image_id IS NOT NULL AS has_cover, COALESCE(t.title, '') <> '' AND COALESCE(t.summary, '') <> '' AS has_es
       FROM portfolio_projects p LEFT JOIN portfolio_project_translations t ON t.project_id = p.id AND t.locale = 'es'
       WHERE p.id = $1;`,
      [id]
    );
    if (!ready.rows[0].has_cover || !ready.rows[0].has_es) throw new Error("No se puede publicar: falta la portada o el texto en español.");
    await client.query(
      "UPDATE portfolio_projects SET status = 'published', published_at = COALESCE(published_at, now()) WHERE id = $1;",
      [id]
    );

    await client.query("COMMIT");
    console.log("\nCambios guardados en la base.");

    if (!galleryUpToDate && oldImages.length > 0) {
      await deleteImageFiles(store, oldImages.map((image) => image.storage_key));
      console.log(`Borradas del bucket las variantes de ${oldImages.length} capturas anteriores.`);
    }
    uploaded = [];
    await revalidatePublicSite();
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(`\nFalló y se revirtió la transacción: ${error instanceof Error ? error.message : error}`);
  if (uploaded.length > 0 && store) {
    await deleteImageFiles(store, uploaded.map((image) => image.storageKey));
    console.error(`Borradas del bucket las ${uploaded.length} capturas recién subidas.`);
  }
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
