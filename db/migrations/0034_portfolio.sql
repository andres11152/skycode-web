-- Portafolio público (casos de éxito de /portafolio) pasa de JSON
-- empaquetado en build time (content/locales/{locale}/projects.json) a
-- Postgres, mismo salto que el blog dio en la migración 0019 — así
-- publicar/editar un caso no requiere deploy, y un caso a medias puede
-- guardarse como borrador en vez de tener que revertir un commit para
-- ocultarlo (como pasó con el caso "Livver": sin estado de borrador, la
-- única forma de no publicarlo fue deshacer el commit entero).
--
-- Prefijo `portfolio_` en todas las tablas nuevas a propósito: este
-- proyecto ya tiene una tabla `projects` (los proyectos de ENTREGA de
-- clientes reales del CRM, migración 0001) que no tiene absolutamente
-- nada que ver con los casos de estudio de marketing del sitio público —
-- nombrarla igual habría sido un choque de nombres real y una fuente
-- segura de confusión al leer el código más adelante.
--
-- `portfolio_project_translations` es una tabla de traducciones aparte
-- (no una fila por locale como en `articles`) porque acá SÍ tiene sentido
-- compartir entre idiomas lo que no es texto: imágenes, tecnologías y
-- métricas son las mismas sin importar el idioma en que se lea el caso,
-- así que separarlas evita triplicar filas de galería/tecnologías por
-- cada locale. En `articles` cada versión de idioma tiene su propio ciclo
-- editorial independiente (justifica una fila propia); acá el ciclo
-- editorial es del CASO completo, no de cada traducción por separado.
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) NOT NULL UNIQUE,
  status VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  -- Orden manual de aparición en /portafolio y en el carrusel de la home —
  -- no hay un criterio automático (ni fecha ni alfabético) que refleje bien
  -- qué caso quiere destacar la agencia primero.
  sort_order INTEGER NOT NULL DEFAULT 0,
  live_url TEXT,
  -- Nombre de un ícono de Phosphor (ej. 'House', 'Truck') — catálogo
  -- cerrado validado en código (lib/queries/portfolio.ts), no con un CHECK
  -- de SQL: la lista de íconos disponibles vive en un solo lugar (el mapa
  -- de íconos del código), no duplicada acá.
  industry_icon VARCHAR(50) NOT NULL DEFAULT 'Buildings',
  published_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_public ON portfolio_projects(sort_order)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS portfolio_project_translations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  locale VARCHAR(2) NOT NULL CHECK (locale IN ('es', 'en', 'fr')),
  title TEXT NOT NULL,
  client_label TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  -- Reto/solución/resultados: lo que convierte una tarjeta de portafolio en
  -- un caso de estudio real en vez de una captura con un párrafo — antes
  -- no existía ningún campo para esto, `description` en el JSON viejo
  -- cargaba con las tres ideas mezcladas en un solo párrafo.
  challenge TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  results TEXT NOT NULL DEFAULT '',
  -- Capacidades de negocio (ej. "SaaS Multi-tenant", "Catálogo Digital") —
  -- separadas de `portfolio_project_technologies` a propósito: una
  -- capacidad no es una tecnología con ícono, es una etiqueta de valor de
  -- negocio, y el JSON viejo mezclaba ambas cosas en el mismo arreglo
  -- `tags` sin poder distinguirlas.
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (project_id, locale)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_translations_project ON portfolio_project_translations(project_id);

-- Catálogo reutilizable de tecnologías — un mismo stack (Next.js,
-- PostgreSQL) se repite entre casos de estudio, así que se modela una vez
-- con su ícono y se referencia desde cada proyecto, en vez de repetir
-- texto libre sin ícono como hacía `tags` en el JSON viejo.
CREATE TABLE IF NOT EXISTS portfolio_technologies (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('frontend', 'backend', 'database', 'infra', 'mobile', 'ai', 'integration', 'other')),
  -- 'simple-icons': `icon_ref` es el slug del paquete simple-icons (ej.
  -- 'nextdotjs', 'postgresql') — se renderiza en línea desde el SVG del
  -- paquete, sin pedirlo a un servidor externo. 'custom': `icon_ref` es el
  -- storage_key de un SVG propio subido al bucket, para una tecnología que
  -- no está en simple-icons.
  icon_source VARCHAR(20) NOT NULL DEFAULT 'simple-icons' CHECK (icon_source IN ('simple-icons', 'custom')),
  icon_ref VARCHAR(200) NOT NULL,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_project_technologies (
  project_id INTEGER NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  -- ON DELETE RESTRICT a propósito (a diferencia del resto de FKs de este
  -- proyecto, casi todas SET NULL o CASCADE): no tiene sentido dejar borrar
  -- una tecnología que un caso de estudio todavía está mostrando — hay que
  -- quitarla del caso primero. La UI del catálogo de tecnologías
  -- (/dashboard/portafolio/tecnologias) debe impedir el borrado mostrando
  -- en cuántos proyectos está en uso, no dejar que este error de FK sea la
  -- única señal.
  technology_id INTEGER NOT NULL REFERENCES portfolio_technologies(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, technology_id)
);

CREATE TABLE IF NOT EXISTS portfolio_project_images (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  -- Key base en el bucket público (ver lib/portfolioStorage.ts) — las
  -- variantes reales (400/800/1600px) se derivan de esta key y se listan
  -- en `variants`, generadas UNA sola vez al subir con `sharp` (nunca en
  -- request time: `next.config.ts` tiene `images.unoptimized: true` en
  -- todo el proyecto).
  storage_key TEXT NOT NULL UNIQUE,
  variants JSONB NOT NULL DEFAULT '{}',
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  -- Texto alternativo por idioma ({"es": "...", "en": "...", "fr": "..."})
  -- — una imagen se comparte entre idiomas, pero su alt text sí debe
  -- traducirse para lectores de pantalla en cada versión del sitio.
  alt JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_project ON portfolio_project_images(project_id, sort_order);

-- Ahora que `portfolio_project_images` existe, `portfolio_projects` puede
-- apuntar a su portada — no se declaró en el CREATE TABLE de arriba
-- porque esa tabla todavía no existía en ese punto del archivo (dependencia
-- circular resuelta con un ALTER TABLE después de crear ambas).
ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS cover_image_id INTEGER REFERENCES portfolio_project_images(id) ON DELETE SET NULL;

-- Resultados medibles opcionales (ej. "−60%" / "tiempo de despacho") — lo
-- que separa una tarjeta de portafolio genérica de un caso de estudio con
-- peso real. `label` es JSONB por idioma (mismo criterio que `alt` de
-- arriba) — no amerita una tabla de traducciones propia por lo corto que
-- es el texto.
CREATE TABLE IF NOT EXISTS portfolio_project_metrics (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  value VARCHAR(50) NOT NULL,
  label JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_project ON portfolio_project_metrics(project_id, sort_order);
