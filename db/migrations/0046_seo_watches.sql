-- Vigilancias de SEO: tras cambiar el título/H1 de una página que ya rankea para una búsqueda, se registra la posición
-- de partida de esa búsqueda y, durante la ventana de vigilancia (por defecto 14 días desde el cambio), el cron diario
-- `seo-pulse` avisa si la posición media vuelve a quedar peor que `alert_above_position` (alerta `watch_drop`).
--
-- Una fila por (búsqueda, fecha del cambio): registrar dos veces el mismo cambio no duplica la vigilancia. La posición de
-- partida se calcula de `gsc_metrics` con los datos hasta la fecha del cambio (ponderada por impresiones) y se guarda
-- junto con su tamaño de muestra, para que quien lea la alerta sepa cuánto pesa la comparación.
CREATE TABLE IF NOT EXISTS seo_watches (
  id                   SERIAL PRIMARY KEY,
  query                TEXT          NOT NULL,
  label                TEXT          NOT NULL DEFAULT '',
  changed_at           DATE          NOT NULL,
  watch_until          DATE          NOT NULL,
  baseline_position    NUMERIC(6, 2),
  baseline_impressions INTEGER       NOT NULL DEFAULT 0,
  alert_above_position NUMERIC(6, 2) NOT NULL DEFAULT 15,
  last_position        NUMERIC(6, 2),
  last_impressions     INTEGER,
  last_checked_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (query, changed_at)
);

-- El nuevo tipo de alerta de la vigilancia.
ALTER TABLE seo_alerts DROP CONSTRAINT IF EXISTS seo_alerts_kind_check;
ALTER TABLE seo_alerts ADD CONSTRAINT seo_alerts_kind_check
  CHECK (kind IN ('top10_entry', 'page_drop', 'cannibalization', 'wrong_target', 'url_not_ok', 'watch_drop'));
