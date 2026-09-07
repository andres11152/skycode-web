-- Fase 9 (Entrega): documentos por proyecto (contratos, especificaciones,
-- entregables) sobre el disco persistente de Render — ver lib/storage.ts.
--
-- `storage_key` es un nombre generado server-side (UUID + extensión), NUNCA
-- el nombre original del archivo — evita colisiones entre dos archivos con
-- el mismo nombre y, sobre todo, evita que un nombre de archivo controlado
-- por el usuario llegue a formar parte de una ruta de filesystem
-- (path traversal). El nombre original se guarda aparte, solo para mostrarlo
-- y para el `Content-Disposition` de la descarga.
--
-- Alcance de esta migración: gestión INTERNA (el equipo sube y descarga
-- documentos de un proyecto). Que el cliente los descargue desde `/portal`
-- es "Portal ampliado", una fase posterior — acá el portal no cambia,
-- mismo criterio que Tareas (0011) y Soporte (0012).
--
-- Sin versionado formal a propósito: cada subida es un documento nuevo, sin
-- cadena de versiones — reemplazar un archivo es subir uno nuevo y borrar
-- (lógicamente) el anterior si ya no aplica. Un historial de versiones real
-- de un mismo documento es una función más grande, no construida todavía.

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id) WHERE deleted_at IS NULL;
