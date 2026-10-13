# Programa de remediación SEO (oct. 2026)

Resultado de las seis fases del programa (commits separados por fase, sin squash). Reglas vigentes en [CLAUDE.md](../CLAUDE.md#programa-de-remediación-seo-oct-2026); aquí está la evidencia, el mapa de redirecciones, el cambio de esquema, las acciones que dependen de una persona y los pasos de despliegue.

## 1. Qué se decidió y por qué

- **Mapa de keywords como fuente única** ([src/seo/keyword-map.ts](../src/seo/keyword-map.ts)): una keyword primaria = una URL por idioma. Title/H1/description de la home, el índice, los nueve servicios y la guía salen de ahí; un test impide duplicar. La home pasa a brand-first (*"SkyCode: software a la medida para empresas en Colombia"*) y deja de competir con `/servicios/desarrollo-software-medida` por la misma búsqueda.
- **No se creó una página nueva para "heredados"**: *sistema heredado* y *sistema legacy* son sinónimos exactos de la misma intención comercial; una segunda URL volvería a canibalizar (el problema que se estaba arreglando). El servicio las cubre en H1 (legacy), y "sistemas heredados"/"modernizar sistemas legacy" en intro, H2 y FAQ. Si dentro de un mes Search Console muestra que "heredados" tiene demanda propia que el servicio no captura, se evalúa una guía informativa (no otra página comercial).
- **Slugs nativos sin migración de esquema**: el despliegue no depende del orden de los scripts de datos. La capa de lectura encuentra la fila del post con el slug histórico **o** el nuevo (`postSlugCandidates`), y la clave de traducción es el slug en español (tabla `BLOG_POST_SLUGS`). Contrapartida: un post futuro con slug distinto por idioma necesita una entrada en esa tabla para unir su hreflang; promover la clave a una columna (`articles.translation_key`) queda como mejora si el blog crece.
- **`gsc_metrics` ya era el histórico** que pedía la fase 5: guarda una fila por fecha, página y query (dimensiones `date`+`page`+`query`) y el upsert es idempotente. Lo que faltaba era el análisis, el relleno histórico y las alertas.
- **Duplicados entre versiones hreflang no cuentan** en `seo:check`: la misma persona (nombre y cargo iguales) en tres idiomas no es un título duplicado.

## 2. Antes / después por URL

"Antes" = producción el 12-oct-2026 (crawl en vivo); "después" = build de esta rama. Descripciones: largo entre paréntesis (todas 140–155). Los títulos se muestran sin el sufijo ` | SkyCode` (10 caracteres, ya incluido en el conteo de ≤60).

| Idioma | URL antes → después | Title antes → después | H1 antes → después | Meta description (después) | Keyword primaria |
|---|---|---|---|---|---|
| es | `/` | Desarrollo de software a la medida para empresas → **SkyCode: software a la medida para empresas en Colombia** | Desarrollo de software a la medida para empresas. El código es 100% tuyo → **SkyCode crea el software de tu empresa. El código es 100% tuyo** | SkyCode es una agencia de software a la medida en Colombia: plataformas web, apps móviles e integraciones. Código 100% tuyo y 90 días de garantía. (146) | skycode |
| en | `/en` | Custom Software Development for Businesses → **SkyCode: Custom Software Agency in Colombia** | Custom software development for businesses. You own 100% of the code → **SkyCode builds your company's software. You own 100% of the code** | SkyCode is a custom software agency in Colombia: web platforms, mobile apps and integrations. You own 100% of the code, with a 90-day warranty. (143) | skycode |
| fr | `/fr` | Développement de Logiciels sur Mesure pour Entreprises → **SkyCode : logiciels sur mesure pour entreprises** | Développement de logiciels sur mesure pour entreprises. Le code est 100 % à vous → **SkyCode conçoit les logiciels de votre entreprise. Le code est 100 % à vous** | SkyCode est une agence de logiciels sur mesure en Colombie : plateformes web, apps mobiles et intégrations. Code 100 % à vous, 90 jours de garantie. (148) | skycode |
| es | `/servicios` | Servicios de desarrollo de software para empresas | Servicios de desarrollo de software para empresas | Desarrollo de software a la medida, apps móviles, APIs, ecommerce, seguridad e IA para empresas. Código 100% tuyo y 90 días de garantía. Cotiza sin costo. (154) | servicios de desarrollo de software |
| en | `/en/servicios` → `/en/services` | Software Development Services for Businesses | Software development services for businesses | Custom software, mobile apps, APIs, ecommerce, security and AI for businesses. Source code 100% yours and a 90-day warranty. Get a free quote. (142) | software development services |
| fr | `/fr/servicios` → `/fr/services` | Développement logiciel pour entreprises → **Services de développement logiciel sur mesure** | Services de développement logiciel pour entreprises → **Services de développement logiciel sur mesure pour entreprises** | Logiciels sur mesure, apps mobiles, API, e-commerce, sécurité et IA pour entreprises. Code 100 % à vous et 90 jours de garantie. Devis gratuit. (143) | services de développement logiciel |
| es | `/servicios/desarrollo-software-medida` | Desarrollo de software a la medida para empresas | Desarrollo de software a la medida para empresas | Plataformas, CRM y sistemas de gestión a la medida para empresas. Código 100% tuyo, avances semanales y 90 días de garantía. Cotiza sin costo. (142) | desarrollo de software a la medida |
| en | `/en/servicios/desarrollo-software-medida` → `/en/services/custom-software-development` | Custom Software Development for Businesses | Custom software development for businesses | Custom platforms, CRMs and management systems built for your workflow. 100% yours: source code, weekly demos and a 90-day warranty. Get a free quote. (149) | custom software development |
| fr | `/fr/servicios/desarrollo-software-medida` → `/fr/services/developpement-logiciel-sur-mesure` | Développement de logiciels sur mesure | Développement de logiciels sur mesure pour entreprises | Plateformes, CRM et systèmes de gestion conçus pour vos processus. Code 100 % à vous, démonstrations hebdomadaires et 90 jours de garantie. Devis gratuit. (154) | développement de logiciels sur mesure |
| es | `/servicios/desarrollo-aplicaciones-moviles` | Desarrollo de Apps Móviles iOS y Android → **Desarrollo de aplicaciones móviles iOS y Android** | Desarrollo de aplicaciones móviles para iOS y Android | Desarrollamos apps móviles para iOS y Android que siguen funcionando sin conexión. Código 100% tuyo, entregas semanales y 90 días de garantía. (142) | desarrollo de aplicaciones móviles |
| en | `/en/servicios/desarrollo-aplicaciones-moviles` → `/en/services/mobile-app-development` | iOS & Android Mobile App Development | iOS and Android mobile app development | We build iOS and Android mobile apps that keep working offline. You own 100% of the code, with weekly deliveries and a 90-day warranty. Get a free quote. (153) | mobile app development |
| fr | `/fr/servicios/desarrollo-aplicaciones-moviles` → `/fr/services/developpement-applications-mobiles` | Développement d'Apps Mobiles iOS et Android → **Développement d'applications mobiles iOS, Android** | Développement d'applications mobiles iOS et Android | Nous développons des applications iOS et Android qui fonctionnent aussi hors connexion. Code 100 % à vous, livraisons hebdomadaires, 90 jours de garantie. (154) | développement d'applications mobiles |
| es | `/servicios/apis-integraciones` | Integración de Sistemas y Desarrollo de APIs | Integración de sistemas y desarrollo de APIs | Conectamos tu software con pasarelas de pago, ERPs, sistemas contables y WhatsApp mediante APIs seguras y documentadas. Respuesta en menos de 4 h hábiles. (154) | integración de sistemas y desarrollo de apis |
| en | `/en/servicios/apis-integraciones` → `/en/services/api-development-system-integration` | System Integration & API Development | System integration and API development | We connect your software to payment gateways, ERPs, accounting systems and WhatsApp through secure, documented APIs. Reply within 4 business hours. (147) | system integration and api development |
| fr | `/fr/servicios/apis-integraciones` → `/fr/services/integration-systemes-developpement-api` | Intégration de systèmes et développement d'API | Intégration de systèmes et développement d'API | Nous connectons votre logiciel aux passerelles de paiement, ERP, outils comptables et WhatsApp via des API sécurisées. Réponse sous 4 h ouvrées. (144) | intégration de systèmes et développement d'api |
| es | `/servicios/frontend-alto-rendimiento` | Desarrollo Web a la Medida con Next.js y React | Desarrollo web a la medida con Next.js y React | Sitios y aplicaciones web rápidas, accesibles y pensadas para posicionar en Google, con Next.js y React. Código 100% tuyo y 90 días de garantía. (144) | desarrollo web a la medida |
| en | `/en/servicios/frontend-alto-rendimiento` → `/en/services/nextjs-react-web-development` | Custom Web Development with Next.js & React | Custom web development with Next.js and React | Fast, accessible web sites and applications built with Next.js and React and designed to rank on Google. You own 100% of the code, with a 90-day warranty. (154) | custom web development |
| fr | `/fr/servicios/frontend-alto-rendimiento` → `/fr/services/developpement-web-nextjs-react` | Développement web sur mesure avec Next.js | Développement web sur mesure avec Next.js et React | Sites et applications web rapides, accessibles et pensés pour le référencement Google, avec Next.js et React. Code 100 % à vous, 90 jours de garantie. (150) | développement web sur mesure |
| es | `/servicios/ecommerce-tienda-online` | Desarrollo de tiendas online y ecommerce | Desarrollo de tiendas online y ecommerce a la medida | Tiendas online a la medida con catálogo amplio, checkout ágil e integración con inventario, pagos y envíos. Tu código, sin ataduras a una plataforma. (149) | desarrollo de tiendas online |
| en | `/en/servicios/ecommerce-tienda-online` → `/en/services/ecommerce-development` | Custom Ecommerce & Online Store Development | Custom ecommerce and online store development | Custom online stores with large catalogs, fast checkout and live sync with inventory, payments and shipping. Your code, no platform lock-in. (140) | online store development |
| fr | `/fr/servicios/ecommerce-tienda-online` → `/fr/services/developpement-boutique-en-ligne` | Développement de boutiques en ligne sur mesure | Développement de boutiques en ligne sur mesure | Boutiques en ligne sur mesure : grand catalogue, paiement fluide, synchronisation stock, paiements et livraison. Votre code, sans plateforme captive. (149) | boutiques en ligne sur mesure |
| es | `/servicios/seguridad-cumplimiento` | Seguridad de Software y Cumplimiento Ley 1581 | Seguridad de software y cumplimiento de la Ley 1581 | Seguridad desde la arquitectura: accesos por rol, cifrado de datos y cumplimiento de Habeas Data (Ley 1581) y RGPD, con buenas prácticas OWASP. (143) | seguridad de software |
| en | `/en/servicios/seguridad-cumplimiento` → `/en/services/software-security-compliance` | Software Security & Data Protection Compliance | Software security and data protection compliance | Security built into the architecture: role-based access, data encryption and GDPR and local data protection law compliance, following OWASP. (140) | software security |
| fr | `/fr/servicios/seguridad-cumplimiento` → `/fr/services/securite-logicielle-conformite` | Sécurité logicielle et conformité RGPD | Sécurité logicielle et conformité à la protection des données | Sécurité dès l'architecture : accès par rôle, chiffrement des données, conformité RGPD et lois locales de protection des données, bonnes pratiques OWASP. (153) | sécurité logicielle |
| es | `/servicios/arquitectura-documentacion` | Arquitectura y documentación técnica de software | Arquitectura y documentación técnica de tu software → **Arquitectura y documentación técnica de software que tu equipo puede mantener** | Entregamos repositorios, variables de entorno y diagramas de arquitectura para que tu equipo u otro proveedor continúe el código sin depender de nosotros. (154) | documentación técnica de software |
| en | `/en/servicios/arquitectura-documentacion` → `/en/services/software-architecture-documentation` | Software Architecture & Technical Documentation | Software architecture and technical documentation | We hand over repositories, environment variables and architecture diagrams so your team or any other vendor can continue the code without depending on us. (154) | software architecture and technical documentation |
| fr | `/fr/servicios/arquitectura-documentacion` → `/fr/services/architecture-documentation-technique` | Architecture et documentation technique | Architecture logicielle et documentation technique | Nous remettons dépôts, variables d'environnement et schémas d'architecture pour que votre équipe ou un autre prestataire reprenne le code sans nous. (148) | documentation technique |
| es | `/servicios/migracion-datos-legacy` | Servicios de migración de sistemas legacy | Migración y modernización de datos → **Servicios de migración de sistemas legacy: modernización sin downtime** | Servicios de migración de sistemas legacy y heredados por fases: sin downtime, sin perder datos y con integridad validada. Cotiza sin costo. (140) | servicios de migración de sistemas legacy |
| en | `/en/servicios/migracion-datos-legacy` → `/en/services/legacy-software-migration` | Legacy Software Migration Services | Legacy Data Migration & Modernization → **Legacy Software Migration Services** | We are a legacy software migration company and agency: phased delivery, zero downtime, no data loss and validated integrity. Get a free quote. (142) | legacy software migration services |
| fr | `/fr/servicios/migracion-datos-legacy` → `/fr/services/migration-systemes-legacy` | Services de migration de systèmes legacy → **Migration système legacy sans interruption** | Migration et modernisation de données → **Migration système legacy : modernisation sans interruption de service** | Migration système legacy par étapes : sans coupure, sans perte de données et intégrité validée. Migration de code legacy et modernisation. Devis gratuit. (153) | migration système legacy |
| es | `/servicios/inteligencia-artificial-aplicada` | IA para empresas: asistentes y automatización | Inteligencia artificial aplicada a tu negocio → **IA para empresas: inteligencia artificial aplicada a tu negocio** | Asistentes de IA y automatización de documentos conectados a la información de tu empresa para ahorrar horas operativas. Implementación a la medida. (148) | ia para empresas |
| en | `/en/servicios/inteligencia-artificial-aplicada` → `/en/services/applied-ai-automation` | AI for Business: Assistants & Automation | Applied artificial intelligence for your business → **AI for business: applied artificial intelligence** | AI assistants and document automation connected to your company's own knowledge base to save operating hours. Implemented to fit your processes. (144) | ai for business |
| fr | `/fr/servicios/inteligencia-artificial-aplicada` → `/fr/services/ia-appliquee-automatisation` | IA pour entreprises : assistants et automatisation | Intelligence artificielle appliquée à votre activité → **IA pour entreprises : intelligence artificielle appliquée** | Assistants IA et automatisation de documents connectés aux connaissances de votre entreprise pour gagner des heures d'exploitation. Sur mesure. (143) | ia pour entreprises |
| es | `/blog/migracion-sistemas-legados-sin-interrupcion` | Migración de sistemas legados sin downtime → **Guía: cómo migrar sistemas legados sin downtime** | Migración de sistemas legados sin downtime → **Guía: cómo migrar sistemas legados sin downtime** | Guía paso a paso para migrar sistemas legados sin downtime ni pérdida de datos: Strangler Fig, errores comunes, decommission y preguntas frecuentes. (148) | migrar sistemas legados sin downtime |
| en | `/en/blog/migracion-sistemas-legados-sin-interrupcion` → `/en/blog/legacy-system-migration-without-downtime` | Legacy System Migration Without Downtime → **Guide: Migrate Legacy Systems Without Downtime** | Legacy System Migration Without Downtime → **Guide: Migrate Legacy Systems Without Downtime** | Step-by-step guide to migrate legacy systems without downtime or data loss: Strangler Fig, common mistakes, decommissioning and a short FAQ. (140) | migrate legacy systems without downtime |
| fr | `/fr/blog/migracion-sistemas-legados-sin-interrupcion` → `/fr/blog/migration-systeme-legacy-sans-interruption` | Migrer un système legacy sans interruption → **Guide : migrer un système legacy sans interruption** | Migrer un système legacy sans interruption → **Guide : migrer un système legacy sans interruption** | Guide pas à pas pour migrer un système legacy sans interruption ni perte de données : Strangler Fig, erreurs fréquentes, décommissionnement et FAQ. (147) | migrer un système legacy sans interruption |


## 3. Mapa de redirecciones 301 (un solo salto, destino 200)

32 reglas (índice + 9 servicios + 6 posts, por cada uno de en y fr). Viven en [src/lib/legacyUrls.ts](../src/lib/legacyUrls.ts) y se ejecutan en [src/proxy.ts](../src/proxy.ts) (la barra final se resuelve en el mismo salto). El español no cambia. `e2e/seo-urls.e2e.test.ts` comprueba contra el servidor real que cada origen responde 301 y que su destino responde 200 sin más saltos, con las filas del blog en ambos estados (slug histórico y renombrado).

| Antes (301) | Después (200) |
|---|---|
| `/en/servicios` | `/en/services` |
| `/en/servicios/desarrollo-software-medida` | `/en/services/custom-software-development` |
| `/en/servicios/desarrollo-aplicaciones-moviles` | `/en/services/mobile-app-development` |
| `/en/servicios/apis-integraciones` | `/en/services/api-development-system-integration` |
| `/en/servicios/frontend-alto-rendimiento` | `/en/services/nextjs-react-web-development` |
| `/en/servicios/ecommerce-tienda-online` | `/en/services/ecommerce-development` |
| `/en/servicios/seguridad-cumplimiento` | `/en/services/software-security-compliance` |
| `/en/servicios/arquitectura-documentacion` | `/en/services/software-architecture-documentation` |
| `/en/servicios/migracion-datos-legacy` | `/en/services/legacy-software-migration` |
| `/en/servicios/inteligencia-artificial-aplicada` | `/en/services/applied-ai-automation` |
| `/en/blog/ley-1581-guia-tecnica-software` | `/en/blog/colombia-law-1581-software-compliance-guide` |
| `/en/blog/deuda-tecnica-como-detectarla` | `/en/blog/how-to-detect-technical-debt` |
| `/en/blog/buenas-practicas-apis-rest` | `/en/blog/rest-api-architecture-best-practices` |
| `/en/blog/outsourcing-software-latam-propiedad-codigo` | `/en/blog/software-outsourcing-latin-america-code-ownership` |
| `/en/blog/migracion-sistemas-legados-sin-interrupcion` | `/en/blog/legacy-system-migration-without-downtime` |
| `/en/blog/optimizacion-costos-nube-serverless-colombia` | `/en/blog/cloud-cost-optimization-serverless-colombia` |
| `/fr/servicios` | `/fr/services` |
| `/fr/servicios/desarrollo-software-medida` | `/fr/services/developpement-logiciel-sur-mesure` |
| `/fr/servicios/desarrollo-aplicaciones-moviles` | `/fr/services/developpement-applications-mobiles` |
| `/fr/servicios/apis-integraciones` | `/fr/services/integration-systemes-developpement-api` |
| `/fr/servicios/frontend-alto-rendimiento` | `/fr/services/developpement-web-nextjs-react` |
| `/fr/servicios/ecommerce-tienda-online` | `/fr/services/developpement-boutique-en-ligne` |
| `/fr/servicios/seguridad-cumplimiento` | `/fr/services/securite-logicielle-conformite` |
| `/fr/servicios/arquitectura-documentacion` | `/fr/services/architecture-documentation-technique` |
| `/fr/servicios/migracion-datos-legacy` | `/fr/services/migration-systemes-legacy` |
| `/fr/servicios/inteligencia-artificial-aplicada` | `/fr/services/ia-appliquee-automatisation` |
| `/fr/blog/ley-1581-guia-tecnica-software` | `/fr/blog/loi-1581-colombie-conformite-logicielle` |
| `/fr/blog/deuda-tecnica-como-detectarla` | `/fr/blog/detecter-dette-technique` |
| `/fr/blog/buenas-practicas-apis-rest` | `/fr/blog/architecture-api-rest-bonnes-pratiques` |
| `/fr/blog/outsourcing-software-latam-propiedad-codigo` | `/fr/blog/externalisation-logicielle-amerique-latine-propriete-code` |
| `/fr/blog/migracion-sistemas-legados-sin-interrupcion` | `/fr/blog/migration-systeme-legacy-sans-interruption` |
| `/fr/blog/optimizacion-costos-nube-serverless-colombia` | `/fr/blog/optimisation-couts-cloud-serverless-colombie` |

## 4. Cambios de schema (@graph)

| Antes | Después |
|---|---|
| `Organization` + `ItemList` de navegación en dos `<script>` del layout, sin `WebSite` | UN `@graph` en el layout: `#organization`, `#website`, `#site-navigation` |
| `Organization`: nombre, contacto, `sameAs` = Facebook + Instagram | + `legalName` (nombre comercial «SkyCode Agency»), `alternateName` ["SkyCode","Sky Code","SkyCode Agency"], `founder` (Person), `foundingDate` y `sameAs` ampliado con LinkedIn, GitHub, Clutch y Google Business **(los que no existen son `{TODO}` y se omiten)** |
| (no existía) | `WebSite` con `name: "SkyCode"`, `alternateName`, `inLanguage`, `publisher → #organization` |
| `Service`: `provider` = Organization redefinida sin `@id`; 3 `<script>` | un `@graph` por página: `WebPage`, `Service` (`@id` = `<url>#service`, el mismo que cita `makesOffer`), `BreadcrumbList`, `FAQPage`; `provider → #organization` |
| `BlogPosting`: `author` = `/equipo#slug`, publisher redefinido | `author` = `Person` con `@id` `/equipo/{slug}#person` (con cargo, foto y `sameAs` si hay perfil), `publisher → #organization`, `isPartOf → #website`, `WebPage` + `BlogPosting` + migas + `FAQPage` en un `@graph` |
| (no existía) | Página de autor: `ProfilePage` → `Person` (`worksFor → #organization`) + migas |
| Caso: `SoftwareApplication` + migas | `WebPage` → `Article` (`about → SoftwareApplication`) → `SoftwareApplication` (`featureList`, `additionalProperty` solo con métricas reales) + migas. Sin `Review` (Google exige valoración) |
| `Bogotá`: `sameAs` = Facebook + Instagram para el mismo `@id` | mismo `sameAs` que el layout (antes declaraba dos conjuntos distintos) |

## 5. Cron, dashboard y alertas

- `POST /api/cron/seo-pulse` (diario): ingesta GSC → auditoría de salud técnica → **análisis semana contra semana** → alertas. `?backfillDays=N` (≤480) rellena el pasado una vez; la ingesta ahora pagina con `startRow` (una ventana larga supera las 25.000 filas).
- **Nuevas alertas** (migración `0045_seo_alerts`, una fila por problema, avisa a los admins UNA vez por campanita + push, se cierra sola): query entra al top 10 (info), página cae >10 posiciones, canibalización (>1 URL del mismo idioma con impresiones para la misma query, sin marca), URL que rankea ≠ la del mapa de keywords, URL del sitemap que deja de responder 200.
- `/dashboard/seo`: panel de alertas abiertas, **marca vs. no marca** (`/sky ?code/i`), distancia de ataque (pos. 8–20, ≥5 impresiones), canibalización/página equivocada y semana contra semana.
- **Gate de CI**: job `seo-gate` ejecuta `npm run seo:check` sobre el build. Falla ante título duplicado o >60, H1 ausente o múltiple, canonical incorrecto, keyword primaria ausente en título/H1 y hreflang incompleto. **Hay que marcarlo como check obligatorio** en la protección de la rama `main`.

## 6. Acciones que requieren a una persona (TODO)

Todo lo que falta es un dato real: el código lo omite en producción (`{TODO}`, ver `npm run seo:todos`: 134 marcadores, la mayoría en los capítulos de los casos).

1. **Perfiles externos de la organización** ([lib/organizationProfiles.ts](../src/lib/organizationProfiles.ts)): URL de la página de **LinkedIn**, de la organización de **GitHub**, del perfil en **Clutch** y del **Perfil de Negocio de Google**. Hoy el `sameAs` solo trae Facebook e Instagram. Crearlos y pegar la URL en esa lista; es lo que más mueve el SERP de marca ("skycode" pos. 4,5).
2. **`foundingDate`** de SkyCode (año o fecha).
3. **`legalName`**: se publica el nombre comercial *SkyCode Agency* (no el nombre civil del titular, que no está aprobado para el schema). Si se constituye una sociedad, se pone su razón social en `ORGANIZATION_LEGAL_NAME`.
4. **Casos Sentry CRM y ServiFuturo** ([scripts/seed-data/seo/case-studies.json](../scripts/seed-data/seo/case-studies.json)): para cada uno, plazos reales (inicio, duración, lanzamiento), **resultados medibles** (Sentry CRM: cuentas que usan la plataforma, tiempo de primera respuesta antes/después, % de conversaciones resueltas por la IA, conversaciones al mes; ServiFuturo: horas de liquidación ahorradas, vehículos o rutas gestionadas, reducción de errores en planillas, tiempo de preparación de una auditoría), infraestructura y despliegue (ServiFuturo: confirmar el stack real), y una **cita textual** con nombre y cargo reales. Cargarlas en `/dashboard/portafolio` (las cifras en "Métricas": salen como `additionalProperty` en el schema).
5. **Precios y plazos** de seguridad y cumplimiento, y de documentación (`service-details.json`, 6 marcadores): ya existe `PRICING` del cotizador para otros servicios; estos dos no tienen equivalente.
6. **Foto y `sameAs`** de cada persona (`/dashboard/perfiles-publicos`): la página de autor muestra la foto si existe (si no, iniciales) y publica LinkedIn/GitHub como `sameAs`. Verifica que las tres personas tengan traducción real en inglés y francés: sin ella su página en ese idioma sale con `noindex`.
7. **Search Console**: tras el despliegue, volver a enviar el sitemap y las URLs de la sección 8.

## 7. Despliegue (orden)

1. Merge y despliegue. La migración `0045_seo_alerts` la aplica el comando previo al despliegue (`npm run db:migrate:deploy`); es aditiva.
2. **No hay que correr nada más para que las URLs funcionen**: el código sirve los slugs nuevos con las filas actuales.
3. Después, una vez: `npm run db:seo-legacy-guide` (reencuadra la guía y pone el enlace comercial) y `npm run db:seo-localized-slugs` (renombra las filas en/fr y reescribe enlaces). Ambos aceptan `--dry-run`, son idempotentes y piden invalidar la caché pública al terminar.
4. `POST /api/cron/seo-pulse?backfillDays=90` (con `x-cron-secret`) para cargar el histórico y que el comparativo semanal sea útil desde el primer día.
5. Verificar con `BASE_URL=https://skycode.agency npm run seo:check` y `npm run seo:canonical`.
6. Cloudflare: regla de `http://www` → 1 salto (pendiente de [seo-urls-legacy.md](seo-urls-legacy.md)).

## 8. URLs a enviar a reindexación en Search Console

Orden de prioridad. Sitemap: reenviar `https://skycode.agency/sitemap.xml`.

**P0, cambió el título/H1 de una URL que ya rankea (inspección de URL → "Solicitar indexación"):**

- `https://skycode.agency/` · `https://skycode.agency/en` · `https://skycode.agency/fr`
- `https://skycode.agency/servicios/migracion-datos-legacy` (H1 y contenido)
- `https://skycode.agency/blog/migracion-sistemas-legados-sin-interrupcion` (reencuadrada como guía)
- `https://skycode.agency/servicios/desarrollo-aplicaciones-moviles`
- `https://skycode.agency/servicios/arquitectura-documentacion`
- `https://skycode.agency/servicios/inteligencia-artificial-aplicada`

**P1, URLs nuevas en inglés y francés (reemplazan a las `/en/servicios/…`, `/fr/servicios/…`):**

- Índices: `https://skycode.agency/en/services` · `https://skycode.agency/fr/services`
- Servicios EN: `/en/services/custom-software-development`, `/en/services/mobile-app-development`, `/en/services/api-development-system-integration`, `/en/services/nextjs-react-web-development`, `/en/services/ecommerce-development`, `/en/services/software-security-compliance`, `/en/services/software-architecture-documentation`, `/en/services/legacy-software-migration`, `/en/services/applied-ai-automation`
- Servicios FR: `/fr/services/developpement-logiciel-sur-mesure`, `/fr/services/developpement-applications-mobiles`, `/fr/services/integration-systemes-developpement-api`, `/fr/services/developpement-web-nextjs-react`, `/fr/services/developpement-boutique-en-ligne`, `/fr/services/securite-logicielle-conformite`, `/fr/services/architecture-documentation-technique`, `/fr/services/migration-systemes-legacy`, `/fr/services/ia-appliquee-automatisation`
- Guía: `/en/blog/legacy-system-migration-without-downtime` · `/fr/blog/migration-systeme-legacy-sans-interruption` (los 6 posts en/fr tienen URL nueva; la lista completa está en la sección 3 y en el sitemap)
- `https://skycode.agency/fr/services` también cambió de título (antes 64 caracteres).

**P2, páginas nuevas (E-E-A-T):** `/equipo/andres-betancourt`, `/equipo/cesar-leon`, `/equipo/ximena-calderon` y sus equivalentes `/en/equipo/…`, `/fr/equipo/…` (solo se indexan los idiomas con traducción real del perfil).

Las URLs antiguas `/en/servicios…`, `/fr/servicios…` y los posts en/fr con slug en español **no hay que enviarlas**: responden 301 y Google las consolida solo.

## 9. Evidencia de verificación

- `npx tsc --noEmit`, `npx eslint .` y `npm test` (1.085+ pruebas): limpios. Integración y e2e nuevos: `seo-urls`, `author-pages`, `case-studies`, `jsonld-pages`, `seo-dashboard`, `seoAnalysis.integration`.
- **`npm run seo:check`, producción antes** (86 URLs, 10 con errores, 13): home ES/EN/FR sin la keyword de marca en el H1; **título duplicado entre `/` y `/servicios/desarrollo-software-medida`** (y en `/en`); título de `/fr` de 64 caracteres; keyword primaria ausente en el título o el H1 de la guía, móviles, arquitectura, legacy e IA.
- **`npm run seo:check`, build de esta rama** (79 URLs con el blog, el equipo y dos casos cargados): `✔ Las 79 URLs pasan todas las comprobaciones` (0 títulos duplicados, 0 títulos >60, 0 H1 ausentes/múltiples, 0 canonical incorrectos, 0 keywords primarias ausentes, 0 hreflang incompletos). El portafolio completo (5 casos con imágenes) no se carga en CI ni en local; lo cubre la auditoría diaria del cron.
- **JSON-LD** de seis páginas representativas (home, servicio ES y EN, guía con FAQ, autor, caso) validado estructuralmente en `e2e/jsonld-pages.e2e.test.ts` (tipos, campos obligatorios, migas, FAQ, referencias `@id` resueltas). Es un validador propio: conviene además pasar la home, un servicio y un artículo por el [Rich Results Test](https://search.google.com/test/rich-results) tras el despliegue.
- **Layout a 375 y 1440 px** (Chrome real, headless): sin desborde horizontal ni H1 recortado en home ×3, servicio ×3, guía ×2, autor y caso. El H1 nuevo de la home ocupa 4 líneas a 375 px (termina a 246 px del borde superior, dentro del primer pantallazo) y 4 a 1440 px (401 px).

## 10. Límites conocidos

- El `sameAs` ampliado, el `foundingDate` y los resultados de los casos dependen de datos que solo el negocio tiene (sección 6).
- Las alertas de caída y de top 10 necesitan dos semanas de histórico: sin `backfillDays` empiezan a ser útiles 14 días después de activar el cron.
- La detección de "página equivocada" asigna una query a un clúster por keyword primaria/secundaria (coincidencia de frase). Queries que no contienen ninguna keyword del mapa no se evalúan; ampliar el mapa amplía la cobertura.
- `translation_key` como columna quedó descartada a propósito (ver sección 1); si el blog crece con slugs distintos por idioma, conviene promoverla.
