-- Notificaciones in-app — hasta ahora los cuatro avisos de
-- lib/queries/notifications.ts (propuesta vista, factura vencida, SLA por
-- vencer, seguimiento de lead) solo llegaban por correo (ver migración
-- 0016). Un correo se puede no ver en el momento; esta tabla agrega una
-- campanita persistente dentro del propio dashboard para el mismo evento
-- — ambos canales se disparan desde el mismo notify*() y comparten la
-- misma condición de "candidato", no hay una segunda fuente de verdad.
--
-- `user_id` es NOT NULL a propósito, a diferencia de los cuatro dedup de
-- 0016/0023: un correo sin destinatario simplemente no se envía (el
-- LEFT JOIN puede dar NULL), pero una notificación in-app sin dueño no
-- tiene ningún lugar donde aparecer — esas filas candidatas se siguen
-- marcando como "avisadas" en sus tablas de origen igual que siempre,
-- solo que no generan ninguna fila acá.
--
-- `read_at` (no un booleano `read`) seguí el mismo patrón que
-- `sessions.revoked_at`/`articles.published_at` — NULL es "no leída" en
-- vez de necesitar dos columnas o un booleano con default explícito.
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(300),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sirve tanto el conteo de no leídas (badge de la campanita) como el
-- listado ordenado por fecha — ambas consultas siempre filtran por
-- user_id primero.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
