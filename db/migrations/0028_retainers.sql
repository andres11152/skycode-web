-- Retainers — contratos recurrentes mensuales (mantenimiento/soporte
-- continuo), a diferencia de las facturas de arriba que son eventos
-- puntuales de un proyecto. Un retainer SIEMPRE está atado a un proyecto
-- existente (`project_id NOT NULL`) — no se modela un "cliente sin
-- proyecto" porque `invoices.project_id` ya es `NOT NULL` en el esquema
-- (migración 0007) y un retainer solo genera facturas normales sobre esa
-- misma tabla; cambiar esa restricción para permitir facturas sin
-- proyecto es un cambio más grande que el que pide este alcance, y en la
-- práctica un retainer siempre es sobre un proyecto ya entregado
-- (mantenimiento continuo de algo que la agencia ya construyó).
--
-- `billing_day` tope en 28 (no 31) para no tener que resolver meses sin
-- ese día (Feb 30 no existe) — mismo tipo de simplificación deliberada
-- que otros campos de fecha del proyecto. `next_invoice_date` es la
-- fuente de verdad real de "cuándo toca la próxima factura" (no se
-- deriva de `billing_day` en cada corrida del cron) — se fija al crear el
-- retainer y avanza un mes exacto cada vez que se genera una factura
-- (ver `generateDueRetainerInvoices()`), así que sigue siendo correcto
-- incluso si el cron no corrió un día puntual (recupera el atraso solo,
-- no se salta ningún ciclo).
CREATE TABLE IF NOT EXISTS retainers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_invoice_date DATE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_retainers_due ON retainers(next_invoice_date) WHERE deleted_at IS NULL AND status = 'active';
