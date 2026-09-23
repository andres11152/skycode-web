-- Fase 0 del plan de SEO orgánico: antes de escribir contenido nuevo hay
-- que saber qué ya está pasando en Google Search Console (impresiones,
-- clics, posición por página y query) para no adivinar. Esta tabla
-- almacena esos datos, ingeridos por un cron diario
-- (POST /api/cron/seo-pulse, ver esa ruta) contra la Search Analytics API
-- de GSC — no hay otra forma de obtener esta información
-- programáticamente, GSC no la expone en ningún otro lado.
--
-- Una fila por combinación (fecha, página, query) — el mismo grano que
-- devuelve la API con dimensiones `date`+`page`+`query`. `UNIQUE` sobre
-- esas tres columnas permite un upsert idempotente: el cron re-consulta
-- una ventana móvil de varios días en cada corrida (los datos de GSC
-- llegan con 1-3 días de retraso y pueden revisarse) sin duplicar filas.
--
-- `locale` se deriva del prefijo de la URL (`/en`, `/fr`, sin prefijo =
-- `es`) al momento de insertar, no en cada consulta — evita repetir esa
-- lógica CASE en cada query de lib/queries/seoMetrics.ts.
CREATE TABLE IF NOT EXISTS gsc_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  page TEXT NOT NULL,
  query TEXT NOT NULL,
  locale VARCHAR(2) NOT NULL DEFAULT 'es',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(7, 5) NOT NULL DEFAULT 0,
  position NUMERIC(6, 2) NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, page, query)
);

-- Las dos consultas reales del dashboard son "últimos N días" (filtro por
-- fecha) y "agregado por página/query" (agrupado, ver getTopPages/getTopQueries
-- en lib/queries/seoMetrics.ts) — ambas se benefician de este índice, que
-- cubre el filtro de rango y deja `page`/`query` disponibles para el GROUP BY
-- sin un segundo acceso a la tabla.
CREATE INDEX IF NOT EXISTS idx_gsc_metrics_date ON gsc_metrics (date DESC);
