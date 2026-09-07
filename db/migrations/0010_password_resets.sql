-- Recuperación de contraseña. Hasta esta migración, la única forma de
-- recuperar acceso era `scripts/reset-admin-password.mjs` por línea de
-- comandos contra la base — viable para el admin único del bootstrap, no
-- para el resto del equipo ni para clientes de portal. Mismo patrón que
-- `invites` (0004): token UUID de un solo uso con expiración, nunca un
-- código corto adivinable.

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_pending ON password_resets(user_id) WHERE used_at IS NULL;
