#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-case-studies.mjs [--dry-run] [--force]
//      (o `npm run db:seo-case-studies`)
//
// Script de contenido (mismo criterio que seo-legacy-migration-cluster.mjs:
// datos, no esquema). Carga en los 5 casos del portafolio los capítulos que
// agregó la migración 0041 —contexto del cliente, arquitectura y stack,
// proceso y tiempos, testimonio— y completa problema/solución/resultados, en
// es/en/fr, con el contenido de scripts/seed-data/seo/case-studies.json.
// También reemplaza el texto alternativo genérico de las capturas
// ("<título del caso>") por una descripción de lo que muestra cada imagen.
//
// Fuente del contenido: SOLO lo ya publicado del caso, sus capturas y el
// sitio público de cada cliente. Lo que no se puede afirmar —cifras de
// resultados, plazos, testimonio y su autor/cargo, y detalles de
// infraestructura— va como `{{TODO: dato real}}` en su PROPIO párrafo o
// campo: la vista pública omite en producción todo lo que contenga el
// marcador (lib/todoPlaceholders.ts), y `npm run seo:todos` los lista.
//
// Criterio para NO pisar trabajo humano (por campo e idioma):
//   - campo vacío o NULL                      -> se escribe
//   - igual al borrador original que dejó otro script (`previous` en el
//     JSON: hoy el texto de enrich-sentry-crm-case.mjs) -> se reemplaza
//   - ya igual al texto nuevo                 -> no hace nada (idempotente)
//   - cualquier otro valor (alguien lo editó) -> se SALTA y se informa
// Para el `alt` de una captura el borrador original es el título del caso en
// ese idioma (lo que puso scripts/migrate-portfolio-projects.mjs). Con
// `--force` se escribe también sobre lo editado a mano: úsalo solo en una
// base de pruebas. Con `--dry-run` no se escribe nada.
//
// Nunca crea casos ni traducciones: si el caso o su traducción en un idioma
// no existen, se salta ese idioma (publicar exige solo español; en/fr son
// opcionales). Las capturas se emparejan por posición (`sort_order`) y solo
// si el caso tiene exactamente las mismas que el JSON; si alguien agregó,
// quitó o reordenó, aborta ese caso en vez de poner el texto en otra imagen.
//
// Las páginas usan ISR (`revalidate = 3600`): el cambio se ve como mucho una
// hora después, o al instante tras el siguiente deploy. Todo va en una sola
// transacción: si algo falla, no queda nada a medias.

import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local (o .env.test para la base de pruebas).");
  process.exit(1);
}

const data = JSON.parse(readFileSync(join(__dirname, "seed-data", "seo", "case-studies.json"), "utf-8"));
const LOCALES = ["es", "en", "fr"];

// campo del JSON -> columna. Lista cerrada: nada del JSON llega al SQL como identificador.
const COLUMNS = {
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

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

/** ¿Se puede escribir `next` sobre `current`? Devuelve el motivo para el informe. */
function decide(current, next, previous) {
  const cur = (current ?? "").trim();
  if (cur === next) return { write: false, reason: "ya aplicado" };
  if (cur === "") return { write: true, reason: "vacío" };
  if (previous && cur === previous.trim()) return { write: true, reason: "borrador original" };
  if (FORCE) return { write: true, reason: "--force" };
  return { write: false, reason: "editado a mano" };
}

const stats = { written: 0, same: 0, skipped: 0, altWritten: 0, altSkipped: 0 };
const client = await pool.connect();
try {
  await client.query("BEGIN");

  for (const [slug, entry] of Object.entries(data.projects)) {
    const project = await client.query("SELECT id FROM portfolio_projects WHERE slug = $1 AND deleted_at IS NULL;", [slug]);
    if (project.rows.length === 0) {
      console.warn(`[${slug}] No existe el caso — se salta (este script nunca crea casos).`);
      continue;
    }
    const projectId = project.rows[0].id;
    let changed = false;
    const titles = {};

    for (const locale of LOCALES) {
      const row = (
        await client.query("SELECT * FROM portfolio_project_translations WHERE project_id = $1 AND locale = $2;", [projectId, locale])
      ).rows[0];
      if (!row) {
        console.warn(`[${slug}/${locale}] Sin traducción en ese idioma — se salta (no se inventa una fila sin título ni resumen).`);
        continue;
      }
      titles[locale] = row.title;

      const sets = [];
      const values = [];
      for (const [field, column] of Object.entries(COLUMNS)) {
        const next = entry[locale][field];
        const verdict = decide(row[column], next, entry.previous?.[locale]?.[field]);
        if (verdict.write) {
          values.push(next);
          sets.push(`${column} = $${values.length}`);
          console.log(`[${slug}/${locale}] ${field}: se escribe (${verdict.reason}).`);
        } else if (verdict.reason === "ya aplicado") {
          stats.same++;
        } else {
          stats.skipped++;
          console.warn(`[${slug}/${locale}] ${field}: SE SALTA (${verdict.reason}).`);
        }
      }
      if (sets.length > 0) {
        values.push(row.id);
        if (!DRY_RUN) {
          await client.query(`UPDATE portfolio_project_translations SET ${sets.join(", ")} WHERE id = $${values.length};`, values);
        }
        stats.written += sets.length;
        changed = true;
      }
    }

    // Texto alternativo de las capturas, emparejado por posición.
    const images = (
      await client.query("SELECT id, alt FROM portfolio_project_images WHERE project_id = $1 ORDER BY sort_order ASC, id ASC;", [projectId])
    ).rows;
    const expected = entry.alt.es.length;
    if (images.length !== expected) {
      console.warn(`[${slug}] Tiene ${images.length} capturas y el JSON describe ${expected} — no se toca ningún alt de este caso.`);
      stats.altSkipped += images.length;
    } else {
      for (let i = 0; i < images.length; i++) {
        const patch = {};
        for (const locale of LOCALES) {
          if (titles[locale] === undefined) continue; // idioma sin traducción: su alt no cambia
          const next = entry.alt[locale][i];
          const cur = (images[i].alt?.[locale] ?? "").trim();
          if (cur === next) continue;
          if (cur === "" || cur === (titles[locale] ?? "").trim() || FORCE) patch[locale] = next;
          else {
            stats.altSkipped++;
            console.warn(`[${slug}/${locale}] captura ${i + 1}: alt SE SALTA (editado a mano).`);
          }
        }
        if (Object.keys(patch).length > 0) {
          // Merge superficial de JSONB (`||`), igual que la ruta de alt del panel: nunca reemplaza el objeto completo.
          if (!DRY_RUN) {
            await client.query("UPDATE portfolio_project_images SET alt = COALESCE(alt, '{}'::jsonb) || $1::jsonb WHERE id = $2;", [
              JSON.stringify(patch),
              images[i].id,
            ]);
          }
          stats.altWritten += Object.keys(patch).length;
          changed = true;
        }
      }
    }

    if (changed && !DRY_RUN) await client.query("UPDATE portfolio_projects SET updated_at = now() WHERE id = $1;", [projectId]);
  }

  if (DRY_RUN) {
    await client.query("ROLLBACK");
    console.log("\nSIMULACRO: no se escribió nada.");
  } else {
    await client.query("COMMIT");
  }
  console.log(
    `\nListo. Campos escritos: ${stats.written}, ya al día: ${stats.same}, saltados por edición manual: ${stats.skipped}. ` +
      `Alt escritos: ${stats.altWritten}, alt saltados: ${stats.altSkipped}.`
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

// Los cambios de este script no pasan por un Route Handler del sitio: se pide invalidar la caché pública.
if (!process.argv.includes("--dry-run") && !process.exitCode) await revalidatePublicSite();
