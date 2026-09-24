-- Recordatorios de seguimiento de leads — hasta ahora un lead se podía
-- "morir de silencio": nada en el sistema recordaba que había que
-- recontactarlo en una fecha concreta, más allá de la memoria de quien lo
-- tenía asignado. `next_follow_up_at` es una fecha simple (no hora), mismo
-- criterio que `invoices.due_date` — nadie agenda un seguimiento comercial
-- a la hora exacta, es "el 3 de octubre", no "el 3 de octubre a las 14:32".
--
-- `follow_up_notified_at` sigue el mismo patrón de dedup que
-- `proposals.viewed_notified_at`/`invoices.overdue_notified_at`/
-- `support_tickets.sla_warning_notified_at` (migración 0016): marca "ya se
-- avisó de este recordatorio", no un historial. La diferencia real con
-- esos tres: acá SÍ se reinicia a NULL cada vez que se actualiza
-- `next_follow_up_at` (ver setLeadFollowUp() en lib/queries/leads.ts) —
-- si alguien reprograma el seguimiento a una fecha nueva, debe volver a
-- avisar en esa fecha nueva, no quedarse marcado como "ya avisado" para
-- siempre por el primer aviso.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_note VARCHAR(500);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(next_follow_up_at) WHERE deleted_at IS NULL;
