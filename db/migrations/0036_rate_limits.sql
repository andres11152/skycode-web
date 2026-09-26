-- Rate limiter persistente — lib/rateLimit.ts contaba intentos en un Map en
-- memoria del propio proceso Node. En un hosting con más de una instancia
-- (o tras cada deploy, que reinicia el proceso) cada instancia tenía su
-- propio contador: un atacante distribuido entre instancias, o que
-- simplemente esperaba al siguiente deploy, evadía el límite sin ningún
-- esfuerzo. Esta tabla mueve el conteo a Postgres, compartido por todas las
-- instancias y persistente entre deploys.
--
-- Ventana fija (no log de timestamps como la versión en memoria): una fila
-- por `key` con un contador y el inicio de su ventana actual. Es una
-- simplificación deliberada — un rate limiter de ventana fija es más
-- barato de expresar como un solo UPSERT atómico (sin condición de carrera
-- entre leer y escribir) que reconstruir un log de timestamps en SQL, y la
-- diferencia práctica contra abuso real (bots/scripts, no un atacante
-- cronometrando milisegundos) es insignificante.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sin cron de limpieza dedicado: `isRateLimited()` borra oportunistamente
-- filas ya vencidas hace rato en una fracción de las llamadas (mismo
-- criterio de "barrido perezoso" que ya usaba la versión en memoria, ver
-- `sweepExpiredBuckets` en el historial de lib/rateLimit.ts) — no vale la
-- pena un séptimo Render Cron Job solo para esto.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits (window_start);
