-- Fase 6 (Rentabilidad): horas reales contra lo cotizado. La fase que
-- justifica todas las anteriores — saber qué proyectos y qué canales
-- dejan dinero.

ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_cost NUMERIC(10,2);

CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
