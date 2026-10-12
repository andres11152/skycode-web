-- Alertas de SEO (/dashboard/seo → "Alertas"): el cron diario `seo-pulse` compara la semana en curso contra la
-- anterior sobre `gsc_metrics` (que ya guarda una fila por fecha, página y query) y registra aquí lo que merece
-- atención:
--   top10_entry      una búsqueda entró al top 10 (informativa)
--   page_drop        una página cayó más de 10 posiciones
--   cannibalization  más de una URL del mismo idioma recibe impresiones para la misma búsqueda
--   wrong_target     la URL que rankea no es la que el mapa de keywords (src/seo/keyword-map.ts) asigna
--   url_not_ok       una URL del sitemap dejó de responder 200 (de la última auditoría de salud técnica)
--
-- Una fila por problema, no por corrida: `dedupe_key` identifica el mismo problema entre corridas y el índice
-- único PARCIAL (solo filas abiertas) impide duplicarlo mientras siga abierto — así el aviso a los admins sale
-- UNA vez, cuando aparece, y no cada día. Cuando la condición desaparece, la corrida siguiente lo cierra
-- (`resolved_at`); si vuelve a aparecer más tarde, nace una fila nueva y se vuelve a avisar.
--
-- `data` guarda el detalle estructurado (páginas, posiciones, ruta esperada) que el panel pinta sin recalcular.
CREATE TABLE IF NOT EXISTS seo_alerts (
  id            SERIAL PRIMARY KEY,
  kind          VARCHAR(20) NOT NULL CHECK (kind IN ('top10_entry', 'page_drop', 'cannibalization', 'wrong_target', 'url_not_ok')),
  severity      VARCHAR(10) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  dedupe_key    TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  detail        TEXT        NOT NULL DEFAULT '',
  data          JSONB       NOT NULL DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  notified_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_alerts_open ON seo_alerts (kind, dedupe_key) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_seo_alerts_recent ON seo_alerts (last_seen_at DESC);
