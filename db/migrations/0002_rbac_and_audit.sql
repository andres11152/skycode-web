-- Fase 1 (Cimientos): sesiones persistentes y revocables, bitácora de
-- auditoría, y borrado lógico. El rol deja de viajar en el JWT (ver
-- src/lib/session.ts) — cada request lo relee de `users.role` a través de
-- `sessions`, así que degradar o desactivar a alguien tiene efecto de
-- inmediato en vez de esperar hasta 7 días a que expire su token.

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- El valor por defecto histórico 'user' no corresponde a ningún rol del
-- modelo actual (admin/sales_manager/traffiker/client, ver src/lib/rbac.ts).
-- Los usuarios existentes no se tocan; solo cambia qué recibe un INSERT
-- nuevo que no especifique rol explícito.
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip VARCHAR(64),
  user_agent VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  diff JSONB,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Borrado lógico: el DELETE físico deja de existir en la capa de aplicación.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices parciales alineados con el patrón real de consulta
-- (WHERE deleted_at IS NULL ORDER BY created_at DESC).
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_client_email ON projects(client_email) WHERE deleted_at IS NULL;
