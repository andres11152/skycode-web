-- 2FA (TOTP, RFC 6238) para el panel interno — ver lib/totp.ts. Opt-in por
-- usuario desde /dashboard/cuenta, no forzado: activarlo a la fuerza sin
-- aviso previo dejaría fuera a cualquier admin real que no tenga a mano su
-- app de autenticación en el momento del deploy.
--
-- `totp_secret` guarda el secreto en texto plano (base32) — mismo criterio
-- de confianza que `password_hash`/`hourly_cost` en esta misma tabla: si la
-- base de datos se compromete, ya hay problemas mucho peores que este
-- secreto puntual, y a diferencia de una contraseña, el secreto TOTP debe
-- poder leerse de vuelta para verificar códigos (no se puede hashear como
-- un password, no hay forma de "comparar" un hash contra un código de 6
-- dígitos sin conocer el secreto real). `totp_enabled` es independiente
-- del secreto para poder generar/reemplazar el secreto durante la
-- configuración sin que 2FA quede activo hasta que el usuario confirme un
-- código real (ver lib/queries/totp.ts).
--
-- `totp_backup_codes` SÍ se guarda hasheado (bcrypt, como una contraseña)
-- porque cada código es de un solo uso y se consume/borra al usarse — es,
-- en la práctica, un array de contraseñas de un solo uso, no un secreto
-- reversible como el de arriba.
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];
