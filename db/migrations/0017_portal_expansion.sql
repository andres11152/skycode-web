-- Fase 3 (Portal ampliado): hasta ahora /portal solo mostraba proyectos
-- de solo lectura. Esta migración habilita la única pieza que necesita
-- esquema nuevo: que el cliente apruebe o rechace un sprint ya completado
-- (un "entregable"). Facturas/saldo, documentos y soporte reutilizan
-- tablas que ya existen (invoices, documents, support_tickets) — solo
-- necesitan queries y rutas nuevas con el filtro de dueño ya establecido
-- (`users.client_id` -> `projects.client_id`), no columnas nuevas.
--
-- Aprobar/rechazar es una acción del cliente, no del equipo interno — no
-- hay UI ni ruta para que el equipo edite un sprint todavía (los sprints
-- se crean una sola vez, al crear el proyecto o aceptar una propuesta, y
-- nunca se editaron desde ninguna interfaz hasta ahora). Solo un sprint en
-- estado 'Completado' es aprobable — la regla vive en el código
-- (lib/queries/projects.ts::approveSprint), no en un CHECK, porque
-- depende del valor de OTRA columna (`status`) en el momento de la
-- escritura, algo que un CHECK de una sola fila no puede expresar sin un
-- trigger.

ALTER TABLE sprints ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) CHECK (approval_status IN ('aprobado', 'rechazado'));
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS approval_comment TEXT;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
