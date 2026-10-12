-- Eventos de las landings de campaña que no son un formulario enviado.
-- Hoy solo el clic al chat de WhatsApp: en Colombia buena parte de quien
-- llega desde un anuncio escribe directo en vez de llenar el formulario, y
-- sin este registro esa gente no aparecía en ningún reporte.
--
-- Es un contador, no un perfil de persona: sin IP, sin agente de usuario y
-- sin nada que identifique a quien hizo clic. Las columnas de atribución
-- (UTM, gclid) solo llegan cuando la persona aceptó la categoría de
-- medición (el cliente las lee de `skycode-attribution`, que no existe sin
-- ese consentimiento); sin él quedan en NULL y el clic igual se cuenta.
--
-- `kind` es un CHECK cerrado (mismo criterio que `support_tickets.priority`):
-- un tipo de evento nuevo es una migración, no un string libre de un POST
-- público.
CREATE TABLE IF NOT EXISTS landing_events (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('whatsapp_click')),
  landing_page VARCHAR(200) NOT NULL,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  gclid VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Los reportes agrupan por tipo y rango de fechas.
CREATE INDEX IF NOT EXISTS idx_landing_events_kind_created ON landing_events(kind, created_at DESC);
