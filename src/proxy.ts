import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

const HOME_PATHS = new Set(["/", "/en", "/fr"]);

export async function proxy(request: NextRequest) {
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
  matcher: ["/dashboard/:path*", "/portal/:path*", "/", "/en", "/fr"],
};
