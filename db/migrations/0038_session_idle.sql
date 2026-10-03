-- Expiración de sesión por INACTIVIDAD.
--
-- Hasta acá una sesión vivía 7 días absolutos (`sessions.expires_at`) sin
-- importar si la persona dejó el navegador abierto en una computadora
-- compartida o robada: cualquiera que llegara a esa pestaña tenía hasta una
-- semana de acceso. `last_seen_at` registra el último uso real; `resolveSession`
-- (lib/authSession.ts) rechaza una sesión que lleva más de SESSION_IDLE_HOURS
-- (12 por defecto) sin usarse, y la renueva como mucho cada 5 minutos para no
-- escribir en la base en cada request.
--
-- DEFAULT now(): las sesiones que ya existen al aplicar esta migración
-- arrancan "vistas ahora" — nadie queda fuera por desplegarla (el cambio de
-- nombre de la cookie a `__Host-skycode_session` ya cierra todas las sesiones
-- una vez de todos modos).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- `resolveSession` filtra por id (PK), pero la limpieza y las consultas de
-- "sesiones activas de un usuario" miran por usuario y actividad reciente.
CREATE INDEX IF NOT EXISTS idx_sessions_user_last_seen ON sessions (user_id, last_seen_at DESC);
