import { NextResponse } from "next/server";
import { lookup as geoipLookup } from "geoip-country";
import { getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/geo - País del visitante por IP, para hosts sin `x-vercel-ip-country`
 * (ej. Render). `proxy.ts` ya cubre el caso Vercel gratis vía ese header; este
 * endpoint es el fallback que consume `useGeoCountry` desde el cliente cuando
 * esa cookie no llegó. Vive en una Route Handler normal (no en Proxy) porque
 * `geoip-country` lee su base de datos desde disco con una ruta relativa a
 * `__dirname`, y solo el bundling estándar de Next.js para rutas de API la
 * preserva correctamente.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const country = ip === "unknown" ? null : (geoipLookup(ip)?.country ?? null);
  return NextResponse.json({ country });
}
