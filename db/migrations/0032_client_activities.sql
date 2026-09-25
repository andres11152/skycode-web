-- Bitácora comercial de clientes — hasta acá `clients.notes` era un
-- único campo de texto libre, sobreescrito cada vez que alguien lo
-- editaba: sin fecha, sin autor, sin historial. Para un sales_manager con
-- varias cuentas activas, "¿qué se habló la última vez?" o "¿quién dejó
-- esta nota?" no tenía respuesta. Mismo patrón ya probado en
-- `lead_activities` (migración 0005) — un timeline de notas con fecha y
-- autor, no una segunda copia de esa tabla porque un lead y un cliente son
-- entidades distintas con su propio ciclo de vida.
--
-- Deliberadamente sin columna `type` (a diferencia de `lead_activities`,
-- que distingue nota/llamada/correo/cambio de estado automático): acá
-- todo es una nota de seguimiento libre, no hay cambios de estado
-- automáticos de un cliente que valga la pena registrar en esta tabla —
-- si esa necesidad aparece más adelante, ahí sí se justificaría agregar
-- el campo, no antes.
--
-- `clients.notes` (el campo plano) NO se migra ni se retira: sigue
-- sirviendo como el resumen editable de una línea que ya usa
-- `updateClient()`/`clients:write`; esta tabla es un historial aparte,
-- aditivo, no un reemplazo.
CREATE TABLE IF NOT EXISTS client_activities (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id, created_at DESC);
