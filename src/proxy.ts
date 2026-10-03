import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import { getClientIp } from "@/lib/clientIp";
import { shouldShed } from "@/lib/loadShed";
import { originMatchesHost } from "@/lib/requestOrigin";
import { buildStrictCsp, generateNonce, isStrictCspPath } from "@/lib/csp";

const HOME_PATHS = new Set(["/", "/en", "/fr"]);

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

export async function proxy(request: NextRequest) {
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

  // Home (donde viven el cotizador y el teléfono de contacto): país por IP
  // vía el header que Vercel ya inyecta en el edge, sin servicio de terceros
  // ni JS de tracking. Se lee acá (no en la página con `headers()`) para no
  // forzar el home a render dinámico — el home sigue 100% estático, solo se
  // agrega una cookie liviana que los componentes leen una vez al montar.
  //
  // En hosts sin este header (ej. Render), no se intenta resolver el país
  // acá: `geoip-country` necesita leer su base de datos desde disco con una
  // ruta relativa a `__dirname`, y el bundle especial que Next.js genera para
  // Proxy no preserva esa ruta (falla en silencio — sin excepción, sin log,
  // simplemente nunca encuentra el archivo). Ese fallback vive en
  // `/api/geo` ([app/api/geo/route.ts](src/app/api/geo/route.ts)), una Route
  // Handler normal con el bundling estándar de Next.js (el mismo que ya usan
  // `/api/contact` y `/api/leads`), consumida desde el cliente vía
  // `useGeoCountry` ([lib/useGeoCountry.ts](src/lib/useGeoCountry.ts)).
  if (HOME_PATHS.has(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    const country = request.headers.get("x-vercel-ip-country");
    if (country) {
      response.cookies.set({
        name: "skycode-geo-country",
        value: country,
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portal/:path*",
    "/login",
    "/olvide-password",
    "/resetear-password/:path*",
    "/invitar/:path*",
    "/",
    "/en",
    "/fr",
    "/api/:path*",
  ],
};
