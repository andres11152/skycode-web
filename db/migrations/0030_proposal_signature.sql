-- Firma electrónica en la aceptación de propuestas — hasta ahora "Aceptar
-- Propuesta" era un solo clic sin ningún rastro de quién lo hizo más allá
-- del `client_email` ya conocido de antemano. No es una firma digital con
-- infraestructura de clave pública (seria una reinvención desproporcionada
-- para el volumen de este negocio) — es el patrón "clickwrap" estándar
-- (mismo criterio que aceptar términos de un SaaS): nombre completo
-- tecleado + checkbox de consentimiento explícito + IP + user-agent +
-- timestamp (`accepted_at`, que ya existía). Bajo la Ley 527 de 1999
-- (Colombia) y leyes equivalentes (ESIGN/UETA en EE.UU., eIDAS en la UE)
-- esta combinación es una firma electrónica válida — no la firma
-- electrónica "calificada"/certificada de más alto nivel, que si exigiría
-- un certificado digital de un tercero de confianza.
--
-- Las tres columnas son NULLABLE: propuestas aceptadas ANTES de esta
-- migración no tienen ni tendrán este dato — no hay forma honesta de
-- reconstruirlo retroactivamente, así que se deja en NULL en vez de
-- inventar un valor de relleno.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_name VARCHAR(200);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(64);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signature_user_agent TEXT;
