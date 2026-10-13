#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/seo-register-watch.mjs --query "migration système legacy" \
//        [--label "..."] [--changed YYYY-MM-DD] [--days 14] [--above 15] [--baseline-days 28] [--dry-run]
//      (o `npm run db:seo-watch -- --query ...`)
//
// Registra una vigilancia de posición (tabla `seo_watches`, migración 0046) ANTES de que Google vea el título nuevo
// de una página que ya rankea: guarda la posición de partida de la búsqueda (media ponderada por impresiones de
// `gsc_metrics` en los `--baseline-days` días hasta la fecha del cambio, todas las páginas) y, durante `--days` días
// desde el cambio, el cron diario `seo-pulse` avisa (alerta `watch_drop`) si la posición medida DESPUÉS del cambio
// queda peor que `--above`. Idempotente por (búsqueda, fecha del cambio). `--changed` por defecto es hoy en Bogotá.

import { parseArgs } from "node:util";
import { Pool } from "pg";

const { values } = parseArgs({
  options: {
    query: { type: "string" },
    label: { type: "string", default: "" },
    changed: { type: "string" },
    days: { type: "string", default: "14" },
    above: { type: "string", default: "15" },
    "baseline-days": { type: "string", default: "28" },
    "dry-run": { type: "boolean", default: false },
  },
});

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}
if (!values.query?.trim()) {
  console.error('Falta --query "búsqueda a vigilar".');
  process.exit(1);
}
const days = Number(values.days);
const above = Number(values.above);
const baselineDays = Number(values["baseline-days"]);
if (![days, above, baselineDays].every((n) => Number.isFinite(n) && n > 0)) {
  console.error("--days, --above y --baseline-days deben ser números positivos.");
  process.exit(1);
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const changed = values.changed ?? today;
if (!/^\d{4}-\d{2}-\d{2}$/.test(changed)) {
  console.error("--changed debe ser YYYY-MM-DD.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false });
try {
  const baseline = await pool.query(
    `SELECT COALESCE(SUM(impressions), 0)::int AS impressions,
            (SUM(position * impressions) / NULLIF(SUM(impressions), 0))::numeric(6,2) AS position
     FROM gsc_metrics
     WHERE lower(query) = lower($1) AND date <= $2::date AND date > $2::date - $3::int;`,
    [values.query.trim(), changed, baselineDays]
  );
  const { impressions, position } = baseline.rows[0];
  console.log(`Búsqueda: «${values.query.trim()}»`);
  console.log(`Posición de partida (${baselineDays} días hasta ${changed}): ${position === null ? "sin datos" : position} con ${impressions} impresiones.`);
  console.log(`Vigilancia: ${changed} → ${changed} + ${days} días; alerta si la posición después del cambio es peor que ${above}.`);

  if (values["dry-run"]) {
    console.log("\n(--dry-run: no se escribió nada.)");
  } else {
    const res = await pool.query(
      `INSERT INTO seo_watches (query, label, changed_at, watch_until, baseline_position, baseline_impressions, alert_above_position)
       VALUES ($1, $2, $3::date, $3::date + $4::int, $5, $6, $7)
       ON CONFLICT (query, changed_at) DO NOTHING RETURNING id, watch_until::text AS watch_until;`,
      [values.query.trim(), values.label, changed, days, position, impressions, above]
    );
    console.log(res.rows[0] ? `\nRegistrada la vigilancia #${res.rows[0].id} (hasta ${res.rows[0].watch_until}).` : "\nYa existía una vigilancia para esa búsqueda y ese cambio: no se tocó.");
  }
} finally {
  await pool.end();
}
