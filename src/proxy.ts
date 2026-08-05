import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

const HOME_PATHS = new Set(["/", "/en", "/fr"]);

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("skycode_session")?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Home (donde vive el cotizador): país por IP vía el header que Vercel ya
  // inyecta en el edge, sin servicio de terceros ni JS de tracking. Se lee
  // acá (no en la página con `headers()`) para no forzar el home a render
  // dinámico — el home sigue 100% estático, solo se agrega una cookie liviana
  // que el cotizador lee una vez al montar para decidir COP vs USD.
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
  matcher: ["/dashboard/:path*", "/", "/en", "/fr"],
};
