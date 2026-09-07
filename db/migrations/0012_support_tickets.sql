-- Fase 8 (Entrega): incidencias de soporte post-lanzamiento con reloj de
-- SLA. Las columnas `projects.sla_warranty_start`/`sla_warranty_end` (0001)
-- ya marcaban que un proyecto está en garantía, pero no había dónde
-- registrar los incidentes reales que ocurren durante esa ventana.
--
-- Alcance de esta migración: gestión INTERNA (el equipo abre y resuelve
-- tickets contra un proyecto, con SLA por prioridad). Que el cliente abra
-- sus propios tickets desde `/portal` es "Portal ampliado", una fase
-- posterior — acá el portal no cambia.
--
-- `sla_due_at` se calcula una sola vez al crear el ticket (created_at +
-- ventana según `priority`) y se guarda, no se recalcula en cada lectura:
-- así el reloj no se corre si alguien cambia la prioridad después, y una
-- reprogramación explícita de SLA queda como una decisión visible, no un
-- efecto secundario de otro campo.

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority VARCHAR(10) NOT NULL DEFAULT 'Media' CHECK (priority IN ('Baja', 'Media', 'Alta', 'Urgente')),
  status VARCHAR(20) NOT NULL DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'En Progreso', 'Resuelto', 'Cerrado')),
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  sla_due_at TIMESTAMPTZ NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_project_id ON support_tickets(project_id) WHERE deleted_at IS NULL;
-- Soporta tanto el tablero interno (todos los tickets abiertos, ordenados
-- por vencimiento) como el cálculo de "vencidos ahora mismo".
CREATE INDEX IF NOT EXISTS idx_support_tickets_open_by_due ON support_tickets(sla_due_at)
  WHERE deleted_at IS NULL AND status NOT IN ('Resuelto', 'Cerrado');
