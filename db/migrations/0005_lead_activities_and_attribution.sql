-- Fase 3 (Comercial): el lead deja de ser una fila con un campo de notas
-- plano y pasa a tener dueño, un historial de actividades con autor y
-- fecha, y el origen de campaña con el que llegó.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id) WHERE deleted_at IS NULL;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbclid VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page VARCHAR(500);

CREATE TABLE IF NOT EXISTS lead_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  type VARCHAR(30) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id, created_at DESC);

-- Migra el contenido de `leads.notes` (una nota plana por lead) a una
-- primera actividad de tipo 'note', para no perder el historial ya
-- escrito por el equipo comercial. Solo para notas no vacías.
INSERT INTO lead_activities (lead_id, type, body, created_at)
SELECT id, 'note', notes, created_at FROM leads
WHERE notes IS NOT NULL AND btrim(notes) != '';

-- El campo plano queda reemplazado por el historial de actividades.
ALTER TABLE leads DROP COLUMN IF EXISTS notes;

-- Sin índice de texto para la búsqueda: el filtro pasa a `ILIKE '%...%'`
-- en SQL (antes se hacía en el navegador contra la tabla completa cargada
-- entera), pero un patrón con comodín al inicio no lo acelera un índice
-- btree normal — necesitaría pg_trgm. Al volumen actual (decenas de leads,
-- no miles) un sequential scan es instantáneo; se revisa si hace falta
-- cuando el volumen real lo justifique.
