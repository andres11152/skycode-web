-- Pagos en línea con Bold (bold.co) desde el portal del cliente —
-- `/portal` pasa de "solo lectura sobre facturas" a poder pagarlas
-- directamente con tarjeta, sin salir del sitio (Botón de pagos Bold,
-- integración personalizada vía `new BoldCheckout(...).open()`, ver
-- lib/bold.ts). Antes, la única forma de registrar un pago era manual
-- desde /dashboard/facturacion (admin), que sigue existiendo intacta.
--
-- `provider` distingue un pago manual de uno confirmado por Bold — nunca
-- se sobreescribe un registro existente, cada fuente añade sus propias
-- filas a `payments` (ya sumadas juntas por `queryInvoices()`, sin cambios
-- ahí). `provider_reference` guarda el `payment_id` que Bold asigna a la
-- transacción — es la clave de idempotencia: tanto el webhook
-- (`POST /api/webhooks/bold`, reintentado hasta 5 veces por Bold si no
-- respondemos 200 a tiempo) como la confirmación al volver del checkout
-- (`GET /api/invoices/[id]/bold-status`) pueden intentar registrar el
-- mismo pago dos veces, y el índice único (parcial — un pago manual nunca
-- tiene `provider_reference`) hace que el segundo intento sea un no-op en
-- vez de duplicar el abono.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_reference
  ON payments(provider_reference) WHERE provider_reference IS NOT NULL;
