-- Plantillas de propuestas — antes cada propuesta nueva se armaba desde
-- cero, así que cotizar el mismo tipo de proyecto (ej. "sitio
-- institucional", "e-commerce") significaba retipear las mismas partidas
-- una y otra vez. Una plantilla es solo un punto de partida guardado
-- (partidas + IVA + moneda) — nunca se referencia desde una propuesta real
-- después de crearla (no hay `proposals.template_id`), es "copiar y
-- editar", no un vínculo vivo: cambiar una plantilla más adelante no debe
-- alterar ninguna propuesta que ya se creó a partir de ella.
--
-- `items` es JSONB (mismo shape que `proposal_items`: description/quantity/
-- unit_price) en vez de una tabla `proposal_template_items` aparte —
-- deliberado: una plantilla no necesita integridad relacional real con sus
-- ítems (no se consultan por separado, no tienen FK propias, no hay
-- `sort_order` que mantener vía índice), solo se leen/escriben como un
-- bloque al aplicar o guardar la plantilla completa. Mismo criterio que
-- `audit_log.diff`.
CREATE TABLE IF NOT EXISTS proposal_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(created_at DESC) WHERE deleted_at IS NULL;
