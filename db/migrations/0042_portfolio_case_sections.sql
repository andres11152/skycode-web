-- Casos de estudio del portafolio con estructura de caso completo (plan de
-- SEO). Hasta acá una traducción solo tenía `challenge`/`solution`/`results`
-- (migración 0034) y los casos reales quedaron con ~90 palabras: demasiado
-- poco para posicionar una URL de "caso de éxito" o para que un cliente
-- potencial entienda qué se construyó y cómo se trabajó.
--
-- Se agregan solo los campos que NO existían — problema, solución y
-- resultados ya están, y las métricas/capturas/tecnologías ya viven en sus
-- tablas compartidas entre idiomas (`portfolio_project_metrics`,
-- `portfolio_project_images`, `portfolio_project_technologies`):
--
--   client_context     Contexto del cliente: quién es y cómo opera, antes de
--                      hablar del problema.
--   architecture       Arquitectura y stack: decisiones técnicas del caso. El
--                      listado de tecnologías con ícono sigue siendo la tabla
--                      `portfolio_project_technologies`; esto es el texto que
--                      explica cómo encajan.
--   process            Proceso y tiempos: cómo se trabajó y cuánto tardó.
--   testimonial_*      Cita del cliente, su nombre y su cargo, en campos
--                      separados: la vista pública omite cada uno por su lado
--                      si falta (una cita sin autor verificado no se publica).
--
-- Todo es NULLABLE y sin DEFAULT a propósito, a diferencia de
-- challenge/solution/results (`NOT NULL DEFAULT ''`): "nunca se cargó" y
-- "se cargó vacío" son lo mismo para la vista pública (el capítulo se
-- oculta), pero un NULL deja claro, para quien revise la base, qué filas
-- nunca pasaron por el editor nuevo. Ninguna fila existente cambia y los
-- casos publicados siguen funcionando idénticos con los campos vacíos.
--
-- Son texto de marketing por idioma, así que viven en la tabla de
-- traducciones (una fila por caso e idioma), no en `portfolio_projects`.
ALTER TABLE portfolio_project_translations ADD COLUMN IF NOT EXISTS client_context TEXT;
ALTER TABLE portfolio_project_translations ADD COLUMN IF NOT EXISTS architecture TEXT;
ALTER TABLE portfolio_project_translations ADD COLUMN IF NOT EXISTS process TEXT;
ALTER TABLE portfolio_project_translations ADD COLUMN IF NOT EXISTS testimonial_quote TEXT;
ALTER TABLE portfolio_project_translations ADD COLUMN IF NOT EXISTS testimonial_author TEXT;
ALTER TABLE portfolio_project_translations ADD COLUMN IF NOT EXISTS testimonial_role TEXT;
