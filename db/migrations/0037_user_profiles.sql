-- Perfiles de persona: hasta acá `users` solo guardaba lo mínimo para
-- autenticar (`name`, `email`, `password_hash`, `role`, `status`) y para
-- calcular rentabilidad (`hourly_cost`, `weekly_hours_capacity`). No había
-- foto, teléfono, cargo, bio, zona horaria — ni siquiera `updated_at`.
-- Consecuencia concreta: nadie podía cambiar su propio nombre ni su
-- contraseña estando logueado (el único camino era salir y pedirse un
-- correo de recuperación), y un cliente de portal no tenía NINGUNA
-- pantalla de cuenta (ver `dashboard/layout.tsx`, que lo redirige a
-- `/portal`, y `/portal`, que no tenía sub-rutas) — o sea, tampoco podía
-- activar 2FA ni revocar sus propias sesiones.
--
-- Todo lo nuevo es nullable (o con default) a propósito: las filas que ya
-- existen no tienen esta información y no hay forma honesta de
-- inventarla, así que un perfil incompleto es el estado inicial válido,
-- no un error a corregir con un backfill.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT;
-- Mismas 3 variantes WebP que `portfolio_project_images.variants`
-- ({sm,md,lg} → URL pública absoluta), generadas al subir con sharp. Acá
-- son CUADRADAS (64/128/256 con `fit: "cover"`) — ver lib/avatarStorage.ts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_variants JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40);
-- Cargo INTERNO (ej. "Desarrollador Backend Senior"), sin traducir — es
-- para el directorio del equipo del CRM. El cargo de marketing que se
-- muestra en la web pública es otro campo, traducible, y vive en
-- `team_profile_translations.public_role` (ver abajo): no son lo mismo y
-- mezclarlos obligaría a elegir entre precisión interna y copy de marca.
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
-- Zona horaria e idioma preferido: hoy nada los consume todavía, pero son
-- los dos datos que cualquier correo automático (notificaciones,
-- resumen semanal) necesita para no mandar todo en español a las 3am.
-- Se agregan ahora porque el costo de una columna vacía es cero y el de
-- una migración extra después no.
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'America/Bogota';
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(2) NOT NULL DEFAULT 'es';
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;
-- `users` nunca tuvo `updated_at` (solo `created_at`) — sin esto no hay
-- forma de saber cuándo se tocó un perfil por última vez.
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- Perfiles públicos del equipo (la página /equipo del sitio de marketing)
-- ---------------------------------------------------------------------------
-- Hasta acá esa página leía `content/locales/{es,en,fr}/team.json`, así que
-- cambiar una foto o una bio exigía un commit y un deploy — mismo problema
-- que ya resolvieron el blog (migración 0019) y el portafolio (0034).
--
-- Pero acá NO se reutiliza `users` como fuente, a diferencia de lo que
-- parecería natural: de los 3 miembros publicados hoy, ninguno tiene
-- cuenta en el CRM (la tabla `users` tiene exactamente 2 filas reales: el
-- admin y un cliente de prueba). Hacer que /equipo lea de `users` obligaría
-- a fabricar cuentas con credenciales durmientes para gente que no
-- necesita entrar al sistema — un riesgo de seguridad gratuito a cambio de
-- nada. Es el MISMO criterio que ya separa `clients` de `users` desde la
-- migración 0003: una entidad de negocio no es una cuenta de acceso.
--
-- `user_id` es nullable y ON DELETE SET NULL: un perfil público puede
-- existir sin cuenta (el caso de hoy), una cuenta puede existir sin perfil
-- público (el admin), y cuando ambos existen quedan enlazados para que el
-- dashboard pueda mostrarlo. Borrar la cuenta nunca borra la ficha pública.
CREATE TABLE IF NOT EXISTS team_profiles (
  id SERIAL PRIMARY KEY,
  -- CRÍTICO: estos slugs son URLs públicas ya indexadas. Cada post del
  -- blog enlaza a su autor como `/equipo#{author_slug}` (ver
  -- lib/blogPaths.ts::authorUrl), y ese enlace alimenta la entidad
  -- `Person` del JSON-LD. Los artículos publicados usan hoy
  -- 'andres-betancourt' y 'cesar-leon' — la migración de datos debe
  -- preservarlos tal cual o se rompen esos anclas y el structured data.
  slug VARCHAR(120) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  avatar_storage_key TEXT,
  avatar_variants JSONB,
  linkedin_url TEXT,
  github_url TEXT,
  -- Borrador/publicado como booleano y no como el enum de 3 estados de
  -- `portfolio_projects`: un perfil de persona no se "archiva" (o está en
  -- la web o no está), así que un tercer estado no representaría nada real.
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_team_profiles_public ON team_profiles(sort_order)
  WHERE is_published = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_profiles_user ON team_profiles(user_id);

-- El nombre también se traduce acá y no se lee de `users.name`: un perfil
-- público puede no tener cuenta enlazada, y aun teniéndola el nombre de
-- marca puede diferir del nombre de la cuenta. Mismo criterio que
-- `portfolio_project_translations`: lo compartido entre idiomas (foto,
-- orden, enlaces) vive en la tabla padre, lo que es texto vive acá.
CREATE TABLE IF NOT EXISTS team_profile_translations (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES team_profiles(id) ON DELETE CASCADE,
  locale VARCHAR(2) NOT NULL CHECK (locale IN ('es', 'en', 'fr')),
  name TEXT NOT NULL,
  -- Cargo de marketing, traducible (ej. "Backend & Arquitectura") —
  -- distinto de `users.job_title`, que es el cargo interno sin traducir.
  public_role TEXT NOT NULL DEFAULT '',
  public_bio TEXT NOT NULL DEFAULT '',
  UNIQUE (profile_id, locale)
);
CREATE INDEX IF NOT EXISTS idx_team_profile_translations_profile ON team_profile_translations(profile_id);
