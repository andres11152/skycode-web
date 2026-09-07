-- Fase 3 (Cierre financiero): costos operativos que no son horas ni pauta
-- publicitaria (licencias, infraestructura, subcontratos, otros gastos
-- generales). `lib/queries/profitability.ts` solo restaba costo de horas
-- (`time_entries × hourly_cost`) del margen — un proyecto con subcontratos
-- reales o licencias dedicadas mostraba un margen inflado porque ese costo
-- nunca se registraba en ningún lado. Esta migración le da un lugar.
--
-- `project_id` es NULLABLE a propósito: no todo gasto es atribuible a un
-- proyecto (licencias de la agencia, infraestructura compartida) — un
-- gasto sin proyecto es overhead general, visible en el listado pero fuera
-- del cálculo de margen por proyecto (que solo suma gastos con
-- `project_id` propio).
--
-- `category` es un CHECK con un catálogo fijo, no una tabla aparte — el
-- mismo criterio que `support_tickets.priority`: son 4 valores estables,
-- no algo que un usuario vaya a necesitar administrar como catálogo.

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('licencias', 'infraestructura', 'subcontratos', 'otro')),
  description VARCHAR(500) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('COP', 'USD')),
  expense_date DATE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date) WHERE deleted_at IS NULL;
