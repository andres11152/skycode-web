#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seed-portfolio-technologies.mjs
//
// Amplía el catálogo de `portfolio_technologies` (migración 0034) más
// allá de las 4 tecnologías que trajo la migración de datos inicial
// (scripts/migrate-portfolio-projects.mjs, solo cubría lo usado por los 5
// casos ya existentes) — un catálogo real de agencia necesita poder
// etiquetar proyectos futuros con el stack que efectivamente se usa
// (frontend/backend/bases de datos/infra/mobile/IA/integraciones), no
// solo lo retroactivo.
//
// Cada slug se verificó contra `node_modules/simple-icons/icons/` antes
// de escribir esto — varias marcas esperables (AWS, Microsoft, LinkedIn,
// Slack, Twilio, SendGrid, Salesforce, Playwright, OpenAI) NO están en el
// paquete instalado (removidas en algún punto, probablemente por
// solicitudes de marca) y se dejaron fuera a propósito, no por olvido.
//
// Idempotente por slug (`ON CONFLICT (slug) DO UPDATE`) — correrlo de
// nuevo actualiza nombre/categoría si cambian acá, nunca duplica ni
// toca `icon_source`/`icon_ref` de una tecnología ya en uso.

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

// slug = también el `icon_ref` (nombre de archivo en simple-icons/icons/).
const TECHNOLOGIES = [
  // --- Frontend ---
  { slug: "react", name: "React", category: "frontend" },
  { slug: "vuedotjs", name: "Vue.js", category: "frontend" },
  { slug: "angular", name: "Angular", category: "frontend" },
  { slug: "svelte", name: "Svelte", category: "frontend" },
  { slug: "astro", name: "Astro", category: "frontend" },
  { slug: "remix", name: "Remix", category: "frontend" },
  { slug: "tailwindcss", name: "Tailwind CSS", category: "frontend" },
  { slug: "html5", name: "HTML5", category: "frontend" },
  { slug: "css", name: "CSS", category: "frontend" },

  // --- Backend ---
  { slug: "python", name: "Python", category: "backend" },
  { slug: "django", name: "Django", category: "backend" },
  { slug: "flask", name: "Flask", category: "backend" },
  { slug: "fastapi", name: "FastAPI", category: "backend" },
  { slug: "php", name: "PHP", category: "backend" },
  { slug: "laravel", name: "Laravel", category: "backend" },
  { slug: "ruby", name: "Ruby", category: "backend" },
  { slug: "rubyonrails", name: "Ruby on Rails", category: "backend" },
  { slug: "dotnet", name: ".NET", category: "backend" },
  { slug: "spring", name: "Spring", category: "backend" },
  { slug: "go", name: "Go", category: "backend" },
  { slug: "graphql", name: "GraphQL", category: "backend" },

  // --- Bases de datos ---
  { slug: "mysql", name: "MySQL", category: "database" },
  { slug: "mongodb", name: "MongoDB", category: "database" },
  { slug: "redis", name: "Redis", category: "database" },
  { slug: "sqlite", name: "SQLite", category: "database" },
  { slug: "supabase", name: "Supabase", category: "database" },
  { slug: "firebase", name: "Firebase", category: "database" },
  { slug: "prisma", name: "Prisma", category: "database" },

  // --- Infraestructura / DevOps ---
  { slug: "docker", name: "Docker", category: "infra" },
  { slug: "kubernetes", name: "Kubernetes", category: "infra" },
  { slug: "nginx", name: "NGINX", category: "infra" },
  { slug: "vercel", name: "Vercel", category: "infra" },
  { slug: "netlify", name: "Netlify", category: "infra" },
  { slug: "cloudflare", name: "Cloudflare", category: "infra" },
  { slug: "render", name: "Render", category: "infra" },
  { slug: "digitalocean", name: "DigitalOcean", category: "infra" },
  { slug: "githubactions", name: "GitHub Actions", category: "infra" },
  { slug: "git", name: "Git", category: "infra" },
  { slug: "github", name: "GitHub", category: "infra" },
  { slug: "gitlab", name: "GitLab", category: "infra" },
  { slug: "sentry", name: "Sentry", category: "infra" },

  // --- Mobile ---
  { slug: "flutter", name: "Flutter", category: "mobile" },
  { slug: "swift", name: "Swift", category: "mobile" },
  { slug: "kotlin", name: "Kotlin", category: "mobile" },
  { slug: "expo", name: "Expo", category: "mobile" },
  { slug: "androidstudio", name: "Android Studio", category: "mobile" },
  { slug: "xcode", name: "Xcode", category: "mobile" },

  // --- IA ---
  { slug: "anthropic", name: "Anthropic", category: "ai" },
  { slug: "claude", name: "Claude", category: "ai" },

  // --- Integraciones ---
  { slug: "stripe", name: "Stripe", category: "integration" },
  { slug: "paypal", name: "PayPal", category: "integration" },
  { slug: "resend", name: "Resend", category: "integration" },
  { slug: "zapier", name: "Zapier", category: "integration" },
  { slug: "googleanalytics", name: "Google Analytics", category: "integration" },

  // --- Otros (plataformas/CMS/herramientas de diseño) ---
  { slug: "shopify", name: "Shopify", category: "other" },
  { slug: "woocommerce", name: "WooCommerce", category: "other" },
  { slug: "wordpress", name: "WordPress", category: "other" },
  { slug: "figma", name: "Figma", category: "other" },
  { slug: "framer", name: "Framer", category: "other" },
  { slug: "jira", name: "Jira", category: "other" },
];

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

try {
  let created = 0;
  let updated = 0;
  for (const tech of TECHNOLOGIES) {
    const res = await pool.query(
      `INSERT INTO portfolio_technologies (slug, name, category, icon_source, icon_ref)
       VALUES ($1, $2, $3, 'simple-icons', $1)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
       RETURNING (xmax = 0) AS inserted;`,
      [tech.slug, tech.name, tech.category]
    );
    if (res.rows[0].inserted) created++;
    else updated++;
  }
  console.log(`Catálogo de tecnologías: ${created} nueva(s), ${updated} actualizada(s) (${TECHNOLOGIES.length} en total en este script).`);
} finally {
  await pool.end();
}
