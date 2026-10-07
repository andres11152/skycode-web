#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-outsourcing-post-meta.mjs
//      (o `npm run db:seo-outsourcing-meta`)
//
// Reescribe título (= H1 del artículo) y meta description del post
// `outsourcing-software-latam-propiedad-codigo` para la búsqueda exacta
// "outsourcing de desarrollo de software" (hoy en posición ~20 en Search
// Console), en los 3 idiomas. El título va en ≤50 caracteres: el layout agrega
// " | SkyCode" y el <title> final no debe pasar de 60.
//
// Edita filas YA publicadas (como seo-legacy-migration-cluster.mjs) y mueve
// `updated_at` porque el título/descripción sí cambian; nunca `published_at`.
// Idempotente: si ya tienen el valor, no escribe. Las páginas usan ISR
// (`revalidate = 3600`): el cambio se ve como mucho una hora después.
import { Pool } from "pg";

import { revalidatePublicSite } from "./lib/revalidatePublic.mjs";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const SLUG = "outsourcing-software-latam-propiedad-codigo";
const META = {
  es: {
    title: "Outsourcing de Desarrollo de Software en LATAM",
    description:
      "Cómo elegir proveedor de outsourcing de desarrollo de software en Colombia y LATAM sin perder el control del código ni caer en vendor lock-in.",
  },
  en: {
    title: "Software Development Outsourcing in Latin America",
    description:
      "How to choose a software development outsourcing vendor in Colombia and Latin America without losing control of your code or falling into vendor lock-in.",
  },
  fr: {
    title: "Externalisation de Développement Logiciel en LATAM",
    description:
      "Comment choisir un prestataire d'externalisation du développement logiciel en Colombie et en Amérique latine sans perdre le contrôle de votre code.",
  },
};

for (const [locale, meta] of Object.entries(META)) {
  if (meta.title.length > 50 || meta.description.length > 155) {
    console.error(`Texto fuera de límite en ${locale}: título ${meta.title.length}/50, descripción ${meta.description.length}/155`);
    process.exit(1);
  }
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  let updated = 0;
  for (const [locale, meta] of Object.entries(META)) {
    const res = await pool.query(
      `UPDATE articles SET title = $1, description = $2, updated_at = now()
       WHERE slug = $3 AND locale = $4 AND deleted_at IS NULL
         AND (title IS DISTINCT FROM $1 OR description IS DISTINCT FROM $2);`,
      [meta.title, meta.description, SLUG, locale]
    );
    if (res.rowCount) {
      updated += res.rowCount;
      console.log(`[${locale}] título y descripción actualizados.`);
    } else {
      console.log(`[${locale}] sin cambios (ya actualizado o el post no existe en este entorno).`);
    }
  }
  console.log(`Listo. Filas actualizadas: ${updated}.`);
} finally {
  await pool.end();
}

// Los cambios de este script no pasan por un Route Handler del sitio: se pide invalidar la caché pública.
if (!process.argv.includes("--dry-run") && !process.exitCode) await revalidatePublicSite();
