import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import { getClientIp } from "@/lib/clientIp";
import { shouldShed } from "@/lib/loadShed";
import { originMatchesHost } from "@/lib/requestOrigin";
import { buildStrictCsp, generateNonce, isStrictCspPath } from "@/lib/csp";
import { resolveLegacyUrl, stripTrailingSlash } from "@/lib/legacyUrls";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// `/api/cron/*` (secreto compartido `x-cron-secret`) y `/api/webhooks/*`
// (firma `x-bold-signature`) los llama infraestructura server-to-server,
// nunca un navegador — no tiene sentido exigirles un `Origin` de este
// sitio, y de hecho normalmente no lo mandan.
const ORIGIN_CHECK_EXEMPT_PREFIXES = ["/api/cron/", "/api/webhooks/"];

/**
 * Defensa CSRF vía validación de `Origin` (patrón "Fetch Metadata" que
 * recomienda OWASP como alternativa liviana a tokens CSRF explícitos):
 * este sitio no tenía NINGUNA protección contra un `<form>` o `fetch`
 * cross-site que reutilizara la cookie de sesión `skycode_session`
 * (httpOnly + `SameSite=Lax`, que solo bloquea el caso de navegación
 * cross-site vía GET, no un POST disparado por JS o un formulario en otro
 * dominio).
 *
 * Solo aplica a métodos que mutan estado (GET/HEAD nunca deberían mutar
 * nada, así que quedan afuera) y solo RECHAZA cuando el header `Origin`
 * está presente y no coincide — nunca cuando falta. Un navegador moderno
 * SIEMPRE manda `Origin` en un POST/PUT/PATCH/DELETE cross-site (fetch,
 * XHR o `<form>`), así que "Origin ausente" no es el caso que hay que
 * bloquear: cubre clientes que nunca mandan ese header por diseño
 * (los cron jobs y el webhook de Bold, ya exentos arriba; peticiones
 * server-to-server legítimas; los tests E2E de este proyecto, que usan
 * `fetch` de Node sin ese header — ver `e2e/helpers/client.ts`). Rechazar
 * también cuando falta habría exigido tocar el cliente de test y cualquier
 * integración futura sin ganar protección real, porque un atacante real
 * usando un navegador de verdad no puede omitir ese header por su cuenta.
 */
function hasValidOrigin(request: NextRequest): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return true;
  if (ORIGIN_CHECK_EXEMPT_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return true;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Sin `Origin`: sigue aceptándose (cron, webhooks y tests server-to-server
    // no lo mandan), salvo que el propio navegador declare que la petición
    // es de otro sitio — `Sec-Fetch-Site: cross-site` lo pone el navegador y
    // JS de terceros no puede falsificarlo ni quitarlo.
    return request.headers.get("sec-fetch-site") !== "cross-site";
  }

  // Comparación solo por host (el porqué del esquema ignorado y de
  // `x-forwarded-host`, bug real de producción en Render, está documentado
  // en lib/requestOrigin.ts).
  return originMatchesHost(request.headers);
}

// Rutas que aceptan credenciales o emiten retos: las únicas que un atacante
// puede martillar sin tener sesión y donde cada petición, aun rechazada,
// termina costando CPU o una consulta a Postgres. Se descartan con un token
// bucket en memoria ANTES de llegar al handler (ver lib/loadShed.ts) — no
// reemplaza los límites respaldados en Postgres, que siguen siendo la
// autoridad. 40 de ráfaga y ~42/min sostenido por IP: varias veces lo que
// usa una persona real (reto + login + 2FA), muy por debajo de un script.
const CREDENTIAL_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/login/verify-2fa",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/challenge",
  "/api/team/accept",
]);
const CREDENTIAL_SHED = { capacity: 40, refillPerSecond: 0.7 };

/**
 * `NextResponse.next()` con CSP ESTRICTA (nonce) para las rutas de sesión y
 * credenciales. El nonce va en la cabecera de la PETICIÓN
 * (`Content-Security-Policy` + `x-nonce`) para que Next.js lo lea al
 * renderizar y se lo ponga a sus scripts, y en la de la RESPUESTA para que el
 * navegador lo aplique. Ver src/lib/csp.ts (por qué solo estas rutas).
 */
function nextWithStrictCsp(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildStrictCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/**
 * URLs heredadas del WordPress anterior y barra final. Va PRIMERO: son respuestas de un solo
 * salto que no necesitan sesión, CSP ni límites. Ver lib/legacyUrls.ts (reglas) y
 * `skipTrailingSlashRedirect` en next.config.ts (por qué la barra final se resuelve aquí).
 */
function handleLegacyAndTrailingSlash(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;

  const legacy = resolveLegacyUrl(pathname);
  if (legacy?.kind === "redirect") {
    // La consulta se conserva (UTM de campañas): el destino no la usa para nada más.
    return NextResponse.redirect(new URL(`${legacy.to}${search}`, request.url), legacy.status);
  }
  if (legacy?.kind === "gone") {
    return new NextResponse("410 Gone", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  const stripped = stripTrailingSlash(pathname);
  if (stripped) return NextResponse.redirect(new URL(`${stripped}${search}`, request.url), 308);

  return null;
}

export async function proxy(request: NextRequest) {
  const legacyResponse = handleLegacyAndTrailingSlash(request);
  if (legacyResponse) return legacyResponse;

  if (CREDENTIAL_PATHS.has(request.nextUrl.pathname)) {
    const ip = getClientIp(request);
    // "unknown" (sin cabeceras de IP) no se limita: agruparía a todo el
    // mundo en un solo bucket y un atacante podría bloquear a todos.
    if (ip !== "unknown" && shouldShed(`cred:${ip}`, CREDENTIAL_SHED)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": "30" } },
      );
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/") && !hasValidOrigin(request)) {
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  }

  // Chequeo barato en el edge: solo confirma que exista un JWT con firma y
  // expiración válidas. No puede consultar PostgreSQL (pg no corre en Edge
  // Runtime), así que no sabe el rol ni si la sesión fue revocada — esa
  // autorización real vive en `requireSessionOrRedirect()` dentro de los
  // `layout.tsx` de `/dashboard` y `/portal` (Server Components en Node),
  // que además deciden a cuál de los dos redirigir según el rol.
  if (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/portal")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return nextWithStrictCsp(request);
  }

  // Login, recuperación de contraseña e invitaciones: mismas razones que
  // dashboard/portal (credenciales y sesión), sin chequeo de sesión.
  if (isStrictCspPath(request.nextUrl.pathname)) {
    return nextWithStrictCsp(request);
  }

  // El país del visitante ya no se fija acá: guardarlo en una cookie es una
  // preferencia que requiere consentimiento, y el proxy no puede leerlo (vive
  // en localStorage). `useGeoCountry` consulta `/api/geo` y solo lo cachea en
  // cookie si la persona aceptó la categoría "preferencias".

  return NextResponse.next();
}

export const config = {
  // Los matchers deben ser literales estáticos. Primero lo heredado y la barra final (únicas rutas
  // públicas donde el proxy actúa), luego las rutas con sesión/credenciales de siempre.
  matcher: [
    // Cualquier ruta con barra final → `/x` (reemplaza la redirección de Next, desactivada).
    "/:path+/",
    // URLs heredadas de WordPress y casos retirados (reglas en lib/legacyUrls.ts). El resto de las
    // heredadas con barra final ya las cubre `/:path+/`.
    "/es/inicio",
    "/en/home",
    "/politica-de-privacidad",
    "/portafolio/all",
    "/portfolio/all",
    "/portafolio-cat/:path*",
    "/portfolio-cat/:path*",
    "/en/portfolio/all",
    "/en/portfolio-cat/:path*",
    "/fr/portfolio/all",
    "/fr/portfolio-cat/:path*",
    "/portafolio/moncyre",
    "/en/portfolio/moncyre",
    "/fr/portfolio/moncyre",
    "/feed",
    "/:path*/feed",
    "/wp-content/:path*",
    "/wp-includes/:path*",
    "/wp-admin/:path*",
    "/wp-json/:path*",
    "/wp-login.php",
    "/wp-cron.php",
    "/xmlrpc.php",
    "/dashboard/:path*",
    "/portal/:path*",
    "/login",
    "/olvide-password",
    "/resetear-password/:path*",
    "/invitar/:path*",
    "/api/:path*",
  ],
};
