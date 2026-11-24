-- Invitaciones al portal de clientes. Hasta ahora `invites` solo servía para el equipo interno (admin,
-- sales_manager, traffiker) y no había ninguna vía para crear un usuario `role = 'client'` con su `client_id`:
-- el portal (/portal: proyectos, tickets, documentos, facturas, aprobaciones) era inalcanzable para un cliente real.
-- `client_id` NULL = invitación de equipo (como siempre); con valor = el usuario que se cree queda atado a ese
-- cliente y ve SOLO los proyectos de su `client_id`.
ALTER TABLE invites ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE;
