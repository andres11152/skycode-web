#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/archive-portfolio-case.mjs <slug> [--dry-run]
//      (o `npm run db:archive-portfolio-case -- <slug>`)
//
// Retira un caso del portafolio público SIN borrarlo: pasa a `archived` (deja de
// aparecer en /portafolio, la home, el sitemap y llms.txt) y conserva sus textos
// e imágenes por si se quiere recuperar desde el dashboard. Es lo mismo que el
// botón "Archivar" del editor, pero repetible desde un script junto con
// `migrate-portfolio-projects.mjs` al cambiar un caso por otro. Idempotente.
//
// La URL pública deja de existir: agrega la redirección permanente en
// next.config.ts (ver `redirects()`) para no dejar un 404 donde ya había ranking.
import { Pool } from "pg";

import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";
const slug = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!slug || slug.startsWith("--")) {
  console.error("Uso: archive-portfolio-case.mjs <slug> [--dry-run]");
  process.exit(1);
}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  const found = await pool.query(`SELECT id, status FROM portfolio_projects WHERE slug = $1 AND deleted_at IS NULL;`, [slug]);
  if (found.rows.length === 0) {
    console.log(`"${slug}" no existe en este entorno: nada que archivar.`);
  } else if (found.rows[0].status === "archived") {
    console.log(`"${slug}" ya estaba archivado.`);
  } else if (dryRun) {
    console.log(`[dry-run] "${slug}" pasaría de "${found.rows[0].status}" a "archived".`);
  } else {
    await pool.query(`UPDATE portfolio_projects SET status = 'archived', is_featured = false, updated_at = now() WHERE id = $1;`, [found.rows[0].id]);
    console.log(`"${slug}" archivado (estaba "${found.rows[0].status}"). La página se refresca por ISR en hasta 1 h.`);
  }
} finally {
  await pool.end();
}

// Los cambios de este script no pasan por un Route Handler del sitio: se pide invalidar la caché pública.
if (!process.argv.includes("--dry-run") && !process.exitCode) await revalidatePublicSite();
