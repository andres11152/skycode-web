-- Fase 2 (Estructura): invitaciones de equipo. Reemplaza la creación de
-- cuentas por variable de entorno (ADMIN_SEED_EMAIL/PASSWORD) — esa vía
-- sigue existiendo solo para el primerísimo admin. De ahí en más, un admin
-- invita por correo con un enlace de un solo uso que expira.

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_email_pending ON invites(email) WHERE accepted_at IS NULL;
