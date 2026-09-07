-- Fase 3 (Cierre financiero): SLA de respuesta, tasa de impuesto por
-- defecto, numeración de facturas y una tasa de cambio manual opcional
-- dejan de estar hardcodeados en el código (`SLA_WINDOW_HOURS` en
-- lib/queries/supportTickets.ts, `useState("0")` en ProposalsBoard.tsx,
-- ausencia total de numeración en `invoices`, y `getUsdToCopRate()` sin
-- forma de fijar una tasa manual para un período/contrato).
--
-- Fila única (`id` fijo en 1, forzado por el CHECK) — no hay ámbito de
-- "configuración por cliente" ni "por proyecto" todavía, es configuración
-- global de la agencia. Si algún día se necesita configuración por
-- cliente/contrato, esa es una tabla nueva, no una columna más acá.
--
-- Cambiar `sla_hours_*` no recalcula el `sla_due_at` de tickets ya
-- creados (mismo principio ya documentado en 0012_support_tickets.sql)
-- — solo afecta tickets nuevos desde ese momento.

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_tax_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  invoice_number_prefix VARCHAR(20) NOT NULL DEFAULT 'FAC-',
  invoice_next_number INTEGER NOT NULL DEFAULT 1,
  sla_hours_urgente INTEGER NOT NULL DEFAULT 4,
  sla_hours_alta INTEGER NOT NULL DEFAULT 24,
  sla_hours_media INTEGER NOT NULL DEFAULT 72,
  sla_hours_baja INTEGER NOT NULL DEFAULT 120,
  -- NULL = usar la tasa en vivo de la API externa (comportamiento actual,
  -- ver lib/exchangeRate.ts). Con un valor, ese valor manda siempre, sin
  -- consultar la API ni la caché en base — para fijar una tasa acordada
  -- con un cliente durante la vigencia de un contrato.
  manual_usd_to_cop_rate NUMERIC(12, 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Numeración legible (ej. "FAC-0001") además del `id` serial interno —
-- NULLABLE porque las facturas ya existentes antes de esta migración no
-- tienen (ni necesitan) un número retroactivo, solo las nuevas lo generan
-- (ver createInvoice en lib/queries/invoices.ts).
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE;
