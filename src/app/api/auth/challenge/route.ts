import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SURFACES, guardAuthRequest, issueChallengeFor, normalizeIdentifier, type AuthSurface } from "@/lib/authShield";
import { isRateLimited } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

const ChallengeRequestSchema = z.object({
  surface: z.enum(AUTH_SURFACES as [AuthSurface, ...AuthSurface[]]),
  /** Correo (o el identificador de la superficie) que se está atacando/usando — solo sube la dificultad, nunca revela nada de la cuenta. */
  identifier: z.string().max(254).optional(),
});

/**
 * POST /api/auth/challenge - Emite un reto de proof-of-work firmado para una
 * superficie de autenticación (ver lib/pow.ts). Público (todavía no hay
 * sesión), same-origin estricto, y por POST — no GET — para que el correo no
 * viaje en la URL (queda en logs de acceso y en el historial del navegador).
 *
 * La dificultad que devuelve depende de los fallos recientes de esta IP y de
 * este identificador, exista o no la cuenta: la respuesta nunca confirma ni
 * niega que un correo esté registrado.
 */
export async function POST(request: Request) {
  try {
    const guard = await guardAuthRequest(request, "login");
    if (!guard.ok) return guard.response;

    const parsed = ChallengeRequestSchema.safeParse(guard.body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    // Emitir un reto es barato, pero no gratis (dos lecturas a Postgres): tope
    // propio por IP, además del token bucket de proxy.ts.
    if (guard.ip !== "unknown" && (await isRateLimited(`pow-issue:${guard.ip}`, 60, 10 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { surface, identifier } = parsed.data;
    const issued = await issueChallengeFor(surface, guard.ip, identifier ? normalizeIdentifier(identifier) : null);

    return NextResponse.json(issued, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError("❌ [API Auth Challenge Error]", error);
    return NextResponse.json({ error: "Error de servidor." }, { status: 500 });
  }
}
