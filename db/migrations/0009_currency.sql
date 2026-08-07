-- Soporte real de dos monedas (COP/USD) en todo el dinero del sistema, con
-- tasa de cambio dinámica en vez de asumir que todo está en COP.

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(14,6) NOT NULL,
  source VARCHAR(100) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency, fetched_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_cost_currency VARCHAR(3) NOT NULL DEFAULT 'COP';

-- Restringe las columnas de moneda ya existentes a solo COP/USD — antes
-- eran VARCHAR(10) libre, por convención siempre 'COP' porque ningún
-- formulario ofrecía otra cosa.
ALTER TABLE campaigns ADD CONSTRAINT campaigns_currency_check CHECK (currency IN ('COP', 'USD'));
ALTER TABLE campaign_spend ADD CONSTRAINT campaign_spend_currency_check CHECK (currency IN ('COP', 'USD'));
ALTER TABLE proposals ADD CONSTRAINT proposals_currency_check CHECK (currency IN ('COP', 'USD'));
ALTER TABLE invoices ADD CONSTRAINT invoices_currency_check CHECK (currency IN ('COP', 'USD'));
ALTER TABLE users ADD CONSTRAINT users_hourly_cost_currency_check CHECK (hourly_cost_currency IN ('COP', 'USD'));
