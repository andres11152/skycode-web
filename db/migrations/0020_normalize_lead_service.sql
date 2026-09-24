-- Bug real: `/api/contact` guardaba SIEMPRE service = 'Contacto Web' (todo
-- lead del formulario de contacto entraba con el mismo literal, sin
-- importar qué haya escrito la persona) y `createLead()` (lib/queries/leads.ts)
-- caía a 'Desarrollo General' cuando no se enviaba `service` — dos valores
-- inventados que se leían como si fueran una selección real del visitante.
--
-- Desde este cambio, `service` refleja lo que la persona eligió en el
-- formulario (ver lib/leadServices.ts) o queda NULL cuando no hay
-- selección — nunca un default de relleno. Esta migración normaliza el
-- histórico al mismo criterio: ambos literales pasan a NULL. El dashboard
-- (LeadsTable.tsx) muestra "Sin especificar" para un `service` NULL, así
-- que ningún dato visible se pierde, solo deja de mentir que se capturó
-- algo que en realidad nunca se preguntó.
UPDATE leads
SET service = NULL
WHERE service IN ('Contacto Web', 'Desarrollo General');
