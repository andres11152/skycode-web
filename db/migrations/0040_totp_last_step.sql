-- Anti-replay del TOTP (RFC 6238 §5.2): último paso de 30 s aceptado por
-- usuario. Un código con paso <= a este se rechaza, así el mismo código no
-- sirve dos veces dentro de su ventana de ~90 s.
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT;
