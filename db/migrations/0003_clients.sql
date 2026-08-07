-- Fase 2 (Estructura): `clients` como entidad de negocio propia, separada de
-- `users` (que sigue siendo solo credenciales de acceso). Antes, un proyecto
-- se ataba a `client_email` como texto libre — un cliente con dos correos
-- eran dos clientes distintos, y cambiar de contacto rompía el vínculo.
--
-- Un usuario con portal (`role = 'client'` en `users`) se enlaza a su fila
-- de `clients` por `users.client_id`, no comparando strings de email.

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- Backfill defensivo: si ya existieran proyectos con client_email (hoy no
-- hay ninguno en producción), crea la fila de cliente que falte y enlaza.
-- El nombre queda igual al correo por ahora — no hay forma de inferir un
-- nombre real desde un string de email; se puede corregir a mano después
-- desde la gestión de clientes.
INSERT INTO clients (name, email)
SELECT DISTINCT client_email, client_email FROM projects
WHERE client_email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

UPDATE projects SET client_id = clients.id
FROM clients
WHERE projects.client_email = clients.email AND projects.client_id IS NULL;

ALTER TABLE projects ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE projects DROP COLUMN client_email;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id) WHERE deleted_at IS NULL;
