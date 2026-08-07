-- Fase 4 (Tráfico): campañas, inversión diaria y atribución de leads.
-- Sin integración con Meta/Google Ads todavía — la inversión se carga a
-- mano o por importación, `campaign_spend` no distingue el origen, así que
-- una integración automática futura encaja sobre este mismo modelo sin
-- migrar nada.

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  utm_campaign VARCHAR(255),
  objective VARCHAR(255),
  budget NUMERIC(12,2),
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  starts_at DATE,
  ends_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_utm_campaign ON campaigns(utm_campaign) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS campaign_spend (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, spend_date)
);

-- Vínculo del lead con la campaña que lo trajo. Se completa automáticamente
-- al crear el lead si su utm_campaign calza con una campaña existente
-- (ver /api/contact y /api/leads), y admite reasignación manual para los
-- casos que no calzan (nombre de campaña distinto al UTM real, tráfico
-- orgánico que igual se quiere agrupar, etc.).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id) WHERE deleted_at IS NULL;
