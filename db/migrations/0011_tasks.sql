-- Fase 7 (Entrega): granularidad de trabajo bajo cada proyecto. Hasta esta
-- migración, `sprints` era el nivel más fino que existía (título + % de
-- avance manual, sin responsable ni fecha) — suficiente para mostrarle
-- progreso al cliente, no para que el equipo coordine quién hace qué.
--
-- `sprint_id` es opcional (ON DELETE SET NULL, no CASCADE): una tarea puede
-- vivir directo bajo el proyecto sin pertenecer a un sprint puntual, y
-- borrar un sprint no debe arrastrar sus tareas a la nada — quedan
-- reasignables. `assignee_id` también es SET NULL: si se desactiva o borra
-- a alguien, sus tareas pasadas no deben desaparecer ni bloquear el borrado
-- de la fila de `users` (mismo criterio que `campaigns.created_by`, etc.).

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Progreso', 'Completada')),
  estimated_hours NUMERIC(6,2),
  due_date DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE deleted_at IS NULL;

-- `time_entries` ya distinguía por sprint pero no por tarea puntual — sin
-- esto, "estimated_hours" de una tarea nunca se puede comparar contra horas
-- reales, solo queda como una cifra decorativa. Nullable y SET NULL: una
-- entrada de horas sigue siendo válida sin tarea asociada (trabajo general
-- del proyecto que no se desglosó en tareas), y borrar una tarea no borra
-- el historial de horas ya registrado contra ella.
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id) WHERE task_id IS NOT NULL;
