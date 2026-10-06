-- Índices para claves foráneas y columnas de filtro que no tenían ninguno
-- (auditoría): sin ellos, cada consulta por proyecto/cliente/actor hacía un
-- escaneo secuencial que crece con el historial.
--
-- Sin `CONCURRENTLY` a propósito: `scripts/migrate.mjs` ejecuta cada migración
-- en una transacción y `CREATE INDEX CONCURRENTLY` no puede correr dentro de
-- una. Las tablas son pequeñas; el bloqueo de escritura es de milisegundos.

CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_id ON support_tickets(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retainers_project_id ON retainers(project_id);
CREATE INDEX IF NOT EXISTS idx_retainers_client_id ON retainers(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_spend_campaign_id ON campaign_spend(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_sprint_id ON time_entries(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_client_email ON proposals(lower(client_email));
