#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/backfill-portfolio-image-placeholders.mjs
//
// Rellena el marcador de posición (difuminado de ~16px + color medio) de las
// capturas del portafolio subidas ANTES de que `processAndUploadPortfolioImage`
// lo generara. Se guarda dentro del JSONB `variants` (claves `blur`/`color`),
// igual que las subidas nuevas — sin migración.
//
// Solo lee: descarga cada variante `md` desde su URL pública y escribe en la
// base. No necesita credenciales de R2 ni toca el bucket. Idempotente: una
// fila que ya tiene `blur` y `color` se salta.
//
// NOTA: el `xl` NO se puede rellenar acá. Las fuentes originales no se
// guardaron (solo sm/md/lg, `withoutEnlargement`), así que no hay de dónde
// sacar más resolución; el visor cae a `lg` para esas imágenes.
//
// Los números (16px, calidad 40, color = promedio 1x1) son los mismos de
// src/lib/portfolioStorage.ts::buildImagePlaceholder — si cambias uno,
// cambia el otro.

import { Pool } from "pg";
import sharp from "sharp";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_QUALITY = 40;

async function buildPlaceholder(buffer) {
  const [tiny, pixel] = await Promise.all([
    sharp(buffer).rotate().resize({ width: PLACEHOLDER_WIDTH }).webp({ quality: PLACEHOLDER_QUALITY }).toBuffer(),
    sharp(buffer).rotate().resize(1, 1, { fit: "cover" }).removeAlpha().raw().toBuffer(),
  ]);
  const color = `#${[pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  return { blur: `data:image/webp;base64,${tiny.toString("base64")}`, color };
}

const pool = new Pool({ connectionString, max: 2 });

try {
  const { rows } = await pool.query(
    `SELECT id, variants FROM portfolio_project_images
     WHERE NOT (variants ? 'blur' AND variants ? 'color')
     ORDER BY id ASC;`
  );
  console.log(`Imágenes por rellenar: ${rows.length}`);

  let done = 0;
  let failed = 0;
  for (const row of rows) {
    const source = row.variants?.md ?? row.variants?.lg ?? row.variants?.sm;
    if (!source) {
      console.warn(`  #${row.id}: sin URL de variante, se omite.`);
      failed += 1;
      continue;
    }
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const placeholder = await buildPlaceholder(Buffer.from(await response.arrayBuffer()));
      // `||` fusiona claves: nunca pisa las URLs de las variantes.
      await pool.query(`UPDATE portfolio_project_images SET variants = variants || $1::jsonb WHERE id = $2;`, [
        JSON.stringify(placeholder),
        row.id,
      ]);
      done += 1;
      console.log(`  #${row.id}: ok (${placeholder.color}, ${placeholder.blur.length} bytes)`);
    } catch (error) {
      failed += 1;
      console.warn(`  #${row.id}: falló (${error instanceof Error ? error.message : String(error)}).`);
    }
  }

  console.log(`Listo. Rellenadas: ${done}. Fallidas u omitidas: ${failed}.`);
  if (failed > 0) process.exitCode = 1;
} finally {
  await pool.end();
}
