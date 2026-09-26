import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

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
  if (!origin) return true;

  // Solo se compara el HOST, nunca el esquema — bug real detectado en
  // producción (Render): el edge de Render termina TLS y reenvía la
  // petición al proceso Node por HTTP plano internamente, así que
  // `request.nextUrl.protocol` llegaba como "http:" aunque el navegador
  // mandara `Origin: https://skycode.agency` — comparar el origin completo
  // (esquema incluido, como en la versión anterior) rechazaba TODO login
  // legítimo con 403. El host sigue siendo la comparación que importa para
  // esta defensa: el origen de un atacante cross-site tiene un HOST
  // distinto sin importar el esquema, así que esto no debilita la
  // protección real. `x-forwarded-host` (el que el navegador realmente
  // pidió) tiene prioridad sobre `host` (que en un proxy puede ser el
  // nombre interno del servicio, no el dominio público) cuando ambos
  // existen.
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!requestHost) return false;

  try {
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
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
    const token = request.cookies.get("skycode_session")?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
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
  matcher: ["/dashboard/:path*", "/portal/:path*", "/", "/en", "/fr", "/api/:path*"],
};
