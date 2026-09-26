-- Cumplimiento Ley 1581 de 2012 / Decreto 1377 de 2013 (Habeas Data) para
-- `leads` — hasta acá solo `clients` tenía anonimización (ver migración
-- 0029); un lead que nunca llegó a convertirse en cliente (alguien que
-- solo llenó el formulario de contacto o el cotizador) no tenía NINGÚN
-- mecanismo para ejercer su derecho al olvido, ni la agencia una forma de
-- DEMOSTRAR que hubo autorización previa, expresa e informada al momento
-- de recolectar sus datos (la casilla de "Acepto el tratamiento de mis
-- datos" del formulario público bloqueaba el envío en el navegador, pero
-- el backend nunca registraba ni exigía esa aceptación — bug real de
-- cumplimiento, corregido junto con esta migración).
--
-- `consent_given_at` (no un booleano): igual que `anonymized_at` abajo,
-- guarda CUÁNDO se dio la autorización — es lo que permite demostrar
-- cumplimiento ante la SIC (Superintendencia de Industria y Comercio) si
-- algún día se audita. NULL en leads creados antes de esta migración (no
-- hay forma honesta de reconstruir ese dato retroactivo); desde ahora, los
-- endpoints públicos que crean leads (`/api/contact`, `/api/leads`,
-- `/api/estimator/quote-email`) EXIGEN `consent: true` en el body o
-- rechazan la solicitud con 400 — ver esos route handlers.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- `anonymized_at`: mismo patrón exacto que `clients.anonymized_at`
-- (migración 0029) — anonimización, no DELETE físico, para conservar la
-- fila y sus `lead_activities` como rastro de auditoría interno, solo sin
-- datos identificables. `anonymizeLead()` (lib/queries/leads.ts) reemplaza
-- nombre/email/teléfono/mensaje por valores genéricos. Gateado por el
-- mismo permiso `data_privacy:manage` (exclusivo de admin) que ya protege
-- `clients:anonymize` — es la misma clase de decisión de cumplimiento.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;
