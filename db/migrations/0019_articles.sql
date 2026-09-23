-- Fase 3 del plan de SEO orgánico: el blog deja de servirse desde JSON
-- empaquetado en el build (content/locales/{locale}/blog.json) y pasa a
-- leerse de esta tabla en cada request. Es el cambio que hace posible
-- "aprobar en el dashboard = publicado", sin depender de un deploy —
-- escribir en el JSON en producción no serviría de nada, webpack ya lo
-- empaquetó en el bundle de JS en build time, el servidor no lo vuelve a
-- leer del disco.
--
-- Los JSON de locale ahora solo guardan `meta` (textos de UI de la sección
-- — badge, heading, sufijo de tiempo de lectura, etc.), no `posts` — eso
-- vive acá. El contenido que ya existía se migró una sola vez con
-- scripts/seed-articles-from-json.mjs antes de borrar `posts` de los JSON,
-- así no se perdió nada del trabajo editorial ya hecho.
--
-- Una fila por (slug, locale) — no una tabla de "traducciones" separada
-- de una tabla de "artículos" — porque en la práctica cada versión de
-- idioma tiene su propio ciclo de vida editorial (se puede aprobar el
-- borrador en inglés sin que el francés esté listo todavía), y forzar que
-- avancen juntas habría complicado el flujo de aprobación sin necesidad
-- real.
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) NOT NULL,
  locale VARCHAR(2) NOT NULL CHECK (locale IN ('es', 'en', 'fr')),
  -- draft: recién creado (a mano o por el cron de generación) o devuelto
  -- tras un rechazo — editable libremente.
  -- review: el autor lo dio por terminado, esperando aprobación — sigue
  -- editable, pero ya no es "borrador silencioso".
  -- published: visible en el sitio público. `published_at` se fija la
  -- primera vez que llega a este estado y nunca se vuelve a mover, aunque
  -- se edite después (mismo criterio que blog.ts::updatedAt ya usaba antes
  -- de esta migración — ver la nota histórica en ese archivo).
  status VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  author_slug VARCHAR(100) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  -- Mismo shape que `BlogBlock` en content/blog.ts (paragraph/heading/list/code)
  -- — sin validación de esquema en la base, se valida con Zod en la ruta de
  -- API antes de escribir, igual que el resto de columnas JSONB del proyecto.
  content JSONB NOT NULL DEFAULT '[]',
  -- Query objetivo que originó el borrador cuando lo generó el cron de
  -- contenido (ver lib/contentGeneration.ts) — NULL en artículos creados a
  -- mano. Es contexto editorial, no afecta el render público.
  target_keyword TEXT,
  published_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  -- Motivo del rechazo más reciente (review -> draft) — se sobreescribe en
  -- cada rechazo nuevo, no es un historial (para eso está audit_log, que sí
  -- registra cada transición vía logAudit()).
  rejection_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);

-- La consulta más frecuente del sitio público es "posts publicados de un
-- locale, más reciente primero" — este índice la cubre directamente.
CREATE INDEX IF NOT EXISTS idx_articles_public ON articles (locale, status, published_at DESC) WHERE deleted_at IS NULL;

-- La consulta más frecuente del dashboard es "artículos en un estado dado,
-- de cualquier locale, más recientes primero" (bandeja de revisión).
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status, created_at DESC) WHERE deleted_at IS NULL;
