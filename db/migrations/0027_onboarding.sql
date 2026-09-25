-- Onboarding de cliente — hasta ahora, al aceptar una propuesta y crear
-- el proyecto, no quedaba ningún rastro sistemático de los primeros
-- pasos reales (bienvenida, pedir accesos, recibir brief/assets) más
-- allá de correos sueltos y memoria de quien llevaba el proyecto. Un
-- checklist fijo (no configurable por proyecto, mismo criterio que las
-- categorías de gastos o prioridades de soporte — un catálogo cerrado es
-- más simple que dejarlo editable sin necesidad real todavía) que se crea
-- automáticamente con cada proyecto nuevo.
--
-- `responsible` es solo informativo (quién "debería" hacerlo), NO una
-- restricción de quién puede marcarlo — tanto el cliente como el equipo
-- pueden marcar cualquier ítem como completo (ej. el equipo confirma por
-- llamada que el cliente ya compartió el acceso, y lo marca por él). Una
-- restricción dura ahí sería más fricción que valor.
CREATE TABLE IF NOT EXISTS onboarding_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_key VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  responsible VARCHAR(10) NOT NULL CHECK (responsible IN ('client', 'team')),
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_items_project ON onboarding_items(project_id, position);
