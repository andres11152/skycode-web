// Content-Security-Policy del sitio — fuente ÚNICA de las dos variantes, para
// que no se desincronicen (antes la política vivía solo en next.config.ts).
// Sin dependencias de Node a propósito: la usan next.config.ts (variante laxa,
// al cargar la configuración) y proxy.ts (variante estricta, en cada request).
//
// Dos variantes, y la razón de que sean dos NO es comodidad:
//
//  • ESTRICTA (nonce + 'strict-dynamic', sin 'unsafe-inline' en scripts): solo
//    para las superficies que protegen sesiones y cuentas — login, recuperación,
//    invitaciones, /dashboard y /portal. Un XSS ahí robaría una sesión de
//    administrador; con esta política un script inyectado no puede ejecutarse.
//    Cuesta renderizado DINÁMICO: Next.js solo puede aplicar un nonce al
//    renderizar por request (ver docs/01-app/02-guides/content-security-policy.md:
//    "all pages must be dynamically rendered", sin ISR ni caché de CDN). Esas
//    rutas ya son dinámicas o casi (sesión, cookies) y no son SEO.
//
//  • LAXA (`'unsafe-inline'` en scripts): el sitio de marketing (home, blog,
//    servicios, portafolio…). Aplicar nonces ahí volvería dinámicas TODAS las
//    páginas públicas: adiós a la generación estática, ISR y caché en el edge,
//    justo lo que sostiene el Lighthouse 91 y el TTFB. Es un contenido público
//    sin sesión ni datos sensibles, y las plantillas escapan todo (React) — el
//    riesgo residual es bajo frente al costo en rendimiento y SEO.

const IS_DEV = process.env.NODE_ENV === "development";

// gtag.js (Google Ads) se sirve desde googletagmanager.com y necesita poder
// hacer sus propias requests de conversión/beacon hacia el resto de dominios
// de Google Ads — sin estos, el script se bloquea por CSP antes de ejecutar
// (bug real: la conversión de formulario medía 0 con el formulario funcionando).
// gtag config además dispara un <script src> hacia
// googleads.g.doubleclick.net/pagead/viewthroughconversion/... (el pixel de
// remarketing/view-through).
const GOOGLE_ADS_SCRIPT_SRC = ["https://www.googletagmanager.com", "https://googleads.g.doubleclick.net"];
const GOOGLE_ADS_CONNECT_SRC = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://www.google.com",
  "https://googleads.g.doubleclick.net",
  "https://www.googleadservices.com",
  "https://ad.doubleclick.net",
];
// Google Ads sirve sus píxeles de imagen desde el dominio de Google del país
// del visitante, no siempre www.google.com (visto en consola bloqueando
// www.google.com.co para un visitante colombiano).
const GOOGLE_ADS_IMG_SRC = [
  "https://www.googletagmanager.com",
  "https://www.google.com",
  "https://www.google.com.co",
  "https://googleads.g.doubleclick.net",
  "https://ad.doubleclick.net",
];

// Checkout embebido de Bold (pagos desde /portal, ver lib/bold.ts): la librería
// se inyecta como <script src> y el checkout abre un iframe modal — sin el
// origen en script-src y frame-src ambos se bloquean en silencio.
const BOLD_CHECKOUT_ORIGIN = "https://checkout.bold.co";

/** Rutas con la política estricta (nonce). Prefijos de primer segmento. */
export const STRICT_CSP_PREFIXES = ["login", "olvide-password", "resetear-password", "invitar", "dashboard", "portal"] as const;

export function isStrictCspPath(pathname: string): boolean {
  const first = pathname.split("/")[1] ?? "";
  return (STRICT_CSP_PREFIXES as readonly string[]).includes(first);
}

/**
 * Patrón `source` de next.config.ts para el CSP laxo: todo EXCEPTO las rutas
 * estrictas (lookahead negativo). Si ambas políticas llegaran a la vez, el
 * navegador aplica las dos y gana la más estricta — pero emitirlas
 * mutuamente excluyentes evita depender de eso.
 */
export const LAX_CSP_SOURCE = `/((?!(?:${STRICT_CSP_PREFIXES.join("|")})(?:/|$)).*)`;

function common(): string[] {
  return [
    "default-src 'self'",
    // *.r2.dev: bucket público de imágenes del portafolio (lib/portfolioStorage.ts).
    `img-src 'self' data: https://*.r2.dev ${GOOGLE_ADS_IMG_SRC.join(" ")}`,
    "font-src 'self' data:",
    // La única llamada de red del navegador a un tercero es la de gtag.js
    // (conversión de Google Ads); el resto de APIs externas se consulta desde el servidor.
    `connect-src 'self' ${GOOGLE_ADS_CONNECT_SRC.join(" ")}`,
    // El iframe modal del checkout embebido de Bold.
    `frame-src 'self' ${BOLD_CHECKOUT_ORIGIN}`,
    // Reemplaza y refuerza X-Frame-Options en navegadores modernos.
    "frame-ancestors 'none'",
    // El worker del proof-of-work del login (public/pow-worker.js) es de este origen.
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
}

/** Política del sitio de marketing (estático/ISR). `'unsafe-inline'` es necesario: Next.js inyecta scripts inline para hidratar/streamear RSC. */
export function buildLaxCsp(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...GOOGLE_ADS_SCRIPT_SRC,
    BOLD_CHECKOUT_ORIGIN,
    // `next dev` usa eval() para Fast Refresh y stack traces de React; React
    // nunca lo usa en producción, así que ahí NO se permite.
    ...(IS_DEV ? ["'unsafe-eval'"] : []),
  ];
  return [
    ...common(),
    `script-src ${scriptSrc.join(" ")}`,
    // Framer Motion anima vía el atributo `style` inline (opacity/transform).
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

/**
 * Política estricta con nonce para login/recuperación/invitaciones/dashboard/portal.
 *
 * - `script-src 'nonce-…' 'strict-dynamic'`: solo corren los scripts que lleven
 *   el nonce de ESTA respuesta (Next.js se lo pone solo a los suyos) y los que
 *   ellos carguen; con `'strict-dynamic'` el navegador IGNORA las listas de
 *   hosts y `'unsafe-inline'`, así que un `<script>` inyectado sin nonce no
 *   ejecuta. `'self'` queda solo como respaldo de navegadores sin soporte.
 * - `style-src-attr 'unsafe-inline'` se mantiene a propósito: React emite
 *   atributos `style="…"` en el HTML del servidor (Framer Motion, tamaños
 *   dinámicos) y no existe forma práctica de ponerles nonce. Inyectar estilos
 *   en un atributo no ejecuta código; el vector serio (scripts) queda cerrado.
 *   Los elementos `<style>` sí exigen nonce.
 */
export function buildStrictCsp(nonce: string): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(IS_DEV ? ["'unsafe-eval'"] : [])];
  return [
    ...common(),
    `script-src ${scriptSrc.join(" ")}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
  ].join("; ");
}

/** Nonce criptográficamente aleatorio y único por request (base64 de un UUID v4, el mismo patrón de la guía de Next.js). */
export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}
