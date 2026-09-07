-- Fase 3 (Cierre financiero y cara al cliente): notificaciones por correo
-- para tres eventos que hoy nadie ve sin entrar a mirar — propuesta vista,
-- factura vencida, SLA por vencer. Disparado por un cron externo (Render
-- Cron Job) que pega a POST /api/cron/check-notifications cada cierto
-- tiempo, no por triggers de Postgres ni un job en proceso (este proyecto
-- no corre ningún worker de fondo, todo es request/response de Next.js).
--
-- Cada columna es un marcador de "ya se avisó de esto" (dedup), no un
-- registro histórico de notificaciones — este proyecto no tiene (todavía)
-- una tabla de notificaciones con historial ni preferencias por usuario,
-- solo evita reenviar el mismo aviso en cada corrida del cron. Si se
-- necesita un historial completo o notificaciones in-app más adelante,
-- esa es una tabla nueva, no más columnas acá.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS viewed_notified_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sla_warning_notified_at TIMESTAMPTZ;
