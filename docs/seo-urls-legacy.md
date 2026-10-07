# URLs heredadas, redirecciones y auditoría de canonical

Resultado de la limpieza de URLs del sitio anterior (WordPress) y de la auditoría de canonical/hreflang.
Reglas en [src/lib/legacyUrls.ts](../src/lib/legacyUrls.ts) (probadas en `legacyUrls.test.ts`), ejecutadas por [src/proxy.ts](../src/proxy.ts).

## Cómo funciona

- **301 permanente** a un solo salto, con o sin barra final: `/es/inicio` → `/`, `/en/home` → `/en`,
  `/politica-de-privacidad` → `/politica-privacidad`, `/portafolio/all`, `/portafolio-cat/*`, `/portfolio/all`,
  `/portfolio-cat/*` → `/portafolio` (y `/en/portfolio/all`, `/en/portfolio-cat/*` → `/en/portfolio`; ídem `/fr/`),
  y los casos retirados (`moncyre`, `archived` en la base) → índice del portafolio de su idioma.
  La consulta (`?utm_…`) se conserva en el destino.
- **410 Gone** (nunca a la home): `*/feed`, `/comments/feed`, `/wp-content/*`, `/wp-includes/*`, `/wp-admin/*`,
  `/wp-json/*`, `/wp-login.php`, `/wp-*.php`, `/xmlrpc.php`. Llevan `X-Robots-Tag: noindex`. El RSS real es `/feed.xml`.
- **Por qué en el proxy y no en `redirects()`**: Next antepone SU redirección de barra final (`/x/` → `/x`, 308) a las del
  usuario, así que `/es/inicio/` daba 308 + 301 (dos saltos). `skipTrailingSlashRedirect: true` en `next.config.ts`
  la desactiva y el proxy redirige `/x/` → `/x` con 308 (misma forma canónica sin barra de siempre).
- Para añadir otra URL heredada: una regla en `resolveLegacyUrl()` + su test + su entrada en el `matcher` de
  `proxy.ts` (los matchers deben ser literales estáticos; las variantes con barra final ya las cubre `/:path+/`).

## Antes / después (curl -sIL; "antes" = producción, "después" = build de producción local)

| URL | Antes | Después |
|---|---|---|
| `/es/inicio`, `/es/inicio/` | 404 · 308→404 | 301 → `/` (1 salto) |
| `/en/home`, `/en/home/` | 404 · 308→404 | 301 → `/en` |
| `/politica-de-privacidad(/)` | 404 · 308→404 | 301 → `/politica-privacidad` |
| `/portafolio/all`, `/portafolio-cat/*`, `/portfolio/all`, `/portfolio-cat/*` | 404 | 301 → `/portafolio` |
| `/en/portfolio/all`, `/en/portfolio-cat/*` | 404 | 301 → `/en/portfolio` |
| `/fr/portfolio/all`, `/fr/portfolio-cat/*` | 404 | 301 → `/fr/portfolio` |
| `/feed`, `/feed/`, `/comments/feed(/)`, `/blog/feed(/)`, `/en/feed(/)`, `/fr/feed(/)` | 404 · 308→404 | 410 |
| `/wp-content/*`, `/wp-includes/*`, `/wp-admin`, `/wp-login.php`, `/xmlrpc.php` | 404 | 410 |
| `/portafolio/moncyre`, `/en/portfolio/moncyre`, `/fr/portfolio/moncyre` | 308 → índice | 301 → índice |
| `/cotizador`, `/servicios/frontend-alto-rendimiento`, `/en/servicios`, `/en/portfolio`, `/fr/portfolio` | 200 | 200 |
| `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/en/feed.xml`, `/fr/feed.xml` | 200 | 200 (sin cambios) |

## http → https y www → apex (no se resuelve en el código)

Delante de Render hay **Cloudflare**; las redirecciones de protocolo y de `www` viven ahí. Medido en producción:

| Petición | Cadena |
|---|---|
| `http://skycode.agency/…` | 301 → `https://skycode.agency/…` (1 salto) ✔ |
| `https://www.skycode.agency/…` | 301 → `https://skycode.agency/…` (1 salto) ✔ |
| `http://www.skycode.agency/…` | **301 → `https://www…` → 301 → `https://skycode.agency/…` (2 saltos)** ✘ |

Para dejarla en un salto, una *Redirect Rule* (Rules → Redirect Rules) **antes** de "Always Use HTTPS":
- Si: `http.host eq "www.skycode.agency"`
- Entonces: redirección dinámica 301 a `concat("https://skycode.agency", http.request.uri)` (conserva ruta y query).

Verificación: `curl -sIL http://www.skycode.agency/blog?utm_source=x` debe mostrar un solo 301.

## Auditoría de canonical / hreflang / indexación

`BASE_URL=https://skycode.agency npm run seo:canonical` ([scripts/seo-canonical-audit.mjs](../scripts/seo-canonical-audit.mjs)) lee
el sitemap y, para CADA URL, la pide con `?utm_source=…&gclid=…` y comprueba: 200 sin redirección, un solo canonical igual a la
`<loc>` (sin parámetros ni barra final), sin `noindex` (meta ni `X-Robots-Tag`), hreflang del HTML idéntico a los `xhtml:link` del
sitemap y que cada hreflang sea a su vez una `<loc>`. Sale con código 1 si algo falla.

Línea base de producción: 86 URLs, 1 discrepancia — **la raíz**: el sitemap listaba `https://skycode.agency/` y el HTML emite canonical
y hreflang `https://skycode.agency` (Next normaliza la raíz sin barra). Se alineó el sitemap (`sitemap.ts`, `localeMetadata.ts`).
Tras el cambio: 86/86 correctas.

`robots.txt` sin cambios: bloquea solo `/dashboard`, `/portal`, `/login`, `/api`, `/invitar`, `/olvide-password`,
`/resetear-password`, `/gracias`, `/en/gracias`, `/fr/gracias`. Las páginas privadas y `/gracias` siguen con `noindex, nofollow`.

## Enlazado interno (rastreo de las 86 URLs del sitemap, antes → después)

| Destino | Páginas que lo enlazan en el contenido | Páginas que lo enlazan desde header/footer |
|---|---|---|
| `/cotizador` | 4 → 15 | 0 → 31 |
| `/en/cotizador`, `/fr/cotizador` | 3 → 14 | 0 → 26 |
| `/servicios/frontend-alto-rendimiento` | 6 → 7 | 31 |
| `/en/portfolio`, `/fr/portfolio` | 7 → 8 | 26 |

Cambios: enlace "Cotizador" en el Navbar (desde `lg`; siempre en el cajón móvil) y en el Footer; enlace al cotizador junto a los CTA de cada detalle de servicio; y enlaces
contextuales en los posts (`db:seo-blog-links`, idempotente, sin tocar `updated_at`): nube/serverless → frontend de alto rendimiento y cotizador;
outsourcing → cotizador y portafolio (los tres idiomas). El servicio de frontend pasó a ser "relacionado" de ese post
(`content/relatedContent.ts`), así que su página lo lista en "Artículos relacionados".

## Contenido de las páginas de servicios

- `/servicios/frontend-alto-rendimiento`: ~900 → 1.342 (es) / 1.343 (en) / 1.518 (fr) palabras. Presupuesto de rendimiento, metas de Core Web Vitals, imágenes/fuentes/scripts de terceros,
  precio y plazo reales (de `PRICING`) y rendimiento posterior al lanzamiento. En inglés y francés la sección «en Colombia» ya no es una traducción literal:
  se reescribió para equipos internacionales/francófonos (husos horarios, idioma, 50/50, RGPD/CCPA, sitios multilingües).
- `/en/servicios` (y es/fr): 3 FAQs nuevas (tecnologías, empresas fuera de Colombia, forma de pago) → ~1.000 palabras; alimentan el JSON-LD `FAQPage`.
- Precio/plazo de los 6 servicios con equivalente en el cotizador salen de `PRICING` vía tokens (`content/pricingTokens.ts`); los demás conservan su `{{TODO}}`.

## lastmod

`scripts/generate-lastmod.mjs` guarda un hash del contenido de cada detalle de servicio en `src/content/lastmod-hashes.json` y solo
avanza la fecha de esa página cuando su hash cambia (antes los nueve compartían una fecha: tocar uno "actualizaba" los demás). Añadir
enlaces internos a un artículo no toca su `updated_at`.

## Ronda 2 — páginas rastreadas pero sin indexar

- `/servicios/frontend-alto-rendimiento`: sección de evidencia (peso de la portada, JS gzip e imágenes medidos en skycode.agency; sin puntajes de Lighthouse), 1.528 palabras en `<main>`.
- `/en/servicios` y `/fr/servicios`: bloque nativo "Building for US and UK teams from Bogotá" / "Travailler avec des équipes francophones…", `BreadcrumbList`, 1.144 palabras en `<main>` (EN).
- Footer: enlaces de idioma rastreables (`hrefLang`). Enlaces entrantes desde header/footer: +2 páginas por URL (p. ej. `/en/portfolio` 26 → 28; `/servicios/frontend-alto-rendimiento` 31 → 33); en contenido sin cambios.
- Sitemap: 86 `<url>` únicas, 86/86 con canonical exacto, sin redirección ni noindex (`npm run seo:canonical`). La diferencia con las 85 de Search Console es de conteo/retraso de lectura de GSC, no una URL duplicada o rota.
- Enlaces contextuales nuevos en detalles de servicio: ecommerce → `frontend-alto-rendimiento`; software a medida y apps móviles → `/cotizador` (es/en/fr). Posts: nube → frontend + cotizador, outsourcing → cotizador (ya aplicados con `db:seo-blog-links`).
- `lastmod`: solo se movieron los 4 servicios editados × 3 idiomas y el índice de servicios.
