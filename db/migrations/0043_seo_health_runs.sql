-- Salud técnica de SEO (/dashboard/seo → "Salud técnica"): cada corrida del
-- cron diario recorre el sitemap de producción y guarda el resultado.
--
-- `results` es un JSONB con una entrada por URL auditada (status, TTFB, título,
-- canonical, H1, problemas…). No hay tabla hija a propósito: el resultado se
-- lee y se escribe siempre como un bloque (como `audit_log.diff` o
-- `proposal_templates.items`), nunca se consulta por URL suelta. Las columnas
-- de resumen sí van aparte para poder dibujar la tendencia sin deserializar
-- ~85 filas por corrida.
CREATE TABLE IF NOT EXISTS seo_health_runs (
  id                SERIAL PRIMARY KEY,
  base_url          TEXT        NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  finished_at       TIMESTAMPTZ NOT NULL,
  total_pages       INTEGER     NOT NULL,
  pages_with_errors INTEGER     NOT NULL,
  canonical_errors  INTEGER     NOT NULL,
  duplicate_titles  INTEGER     NOT NULL,
  missing_h1        INTEGER     NOT NULL,
  non_ok_status     INTEGER     NOT NULL,
  avg_ttfb_ms       INTEGER,
  max_ttfb_ms       INTEGER,
  results           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_health_runs_started_at ON seo_health_runs (started_at DESC);
