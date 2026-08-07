-- Fase 5 (Dinero): propuestas comerciales con enlace público, y facturación
-- básica de control interno (no reemplaza factura electrónica DIAN — ver
-- decisión ya documentada en el roadmap).
--
-- `proposals.id` es UUID y ES el token del enlace público
-- (/propuesta/[id]) — no hay un campo de token separado, un identificador
-- adivinable en serie sería un problema de seguridad (cualquiera podría
-- iterar propuestas ajenas), un UUID no.

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY,
  client_email VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  notes TEXT DEFAULT '',
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  accepted_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

CREATE TABLE IF NOT EXISTS proposal_items (
  id SERIAL PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON proposal_items(proposal_id, sort_order);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  due_date DATE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoices_active ON invoices(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  paid_at DATE NOT NULL,
  method VARCHAR(100),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
