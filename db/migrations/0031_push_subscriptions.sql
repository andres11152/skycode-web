-- Notificaciones push del navegador (Web Push / VAPID) — complementa las
-- notificaciones in-app (migración 0024) y por correo ya existentes, para
-- que el equipo se entere de un evento sin tener el dashboard abierto en
-- una pestaña. Autogestión pura (como 2FA o revocar sesiones propias): sin
-- permiso RBAC, cualquier sesión activa esto para sí misma.
--
-- Un usuario puede tener varias filas (un navegador/dispositivo por
-- suscripción) — `endpoint` es la clave real de unicidad (lo asigna el
-- push service del navegador, Chrome/Firefox/etc.), no `user_id` solo.
-- `ON DELETE CASCADE`: si se borra el usuario, sus suscripciones no tienen
-- ningún sentido sin dueño.
--
-- `p256dh`/`auth` son las claves públicas de cifrado que exige el estándar
-- Web Push (RFC 8291) para que el payload viaje cifrado hasta el
-- navegador — se guardan en texto plano porque son claves PÚBLICAS del
-- lado del navegador (equivalente a un endpoint de webhook con su propio
-- secreto de firma), no un secreto que la agencia deba proteger; el
-- secreto real (VAPID_PRIVATE_KEY) vive solo en variables de entorno,
-- nunca en esta tabla.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
