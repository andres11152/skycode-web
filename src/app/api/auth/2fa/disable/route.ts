import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { verifySessionToken } from "@/lib/session";
import { disableTotp } from "@/lib/queries/totp";
import { revokeOtherSessions } from "@/lib/queries/sessions";
import { logAuditBestEffort } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { logError } from "@/lib/logger";

const DisableSchema = z.object({ code: z.string().trim().min(1).max(20) });

/**
 * POST /api/auth/2fa/disable - Apaga 2FA por completo. Exige un código
 * válido (TOTP o de respaldo) como última confirmación — nada más que
 * tener la sesión abierta alcanza para apagar el segundo factor, o
 * alguien que deje su laptop desbloqueada un minuto podría desactivarlo
 * sin que el dueño se entere.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  // Un código TOTP de 6 dígitos se puede forzar desde una sesión robada si
  // estos endpoints no tienen tope de intentos.
  if (await isRateLimited(`2fa-manage:user:${session.id}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }, { status: 429 });
  }

  try {
    const parsed = DisableSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Código requerido." }, { status: 400 });
    }

    const disabled = await disableTotp(session.id, parsed.data.code);
    if (!disabled) {
      return NextResponse.json({ error: "Código incorrecto." }, { status: 400 });
    }

    await logAuditBestEffort(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "user.2fa_disabled",
      entityType: "user",
      entityId: session.id,
      ip: getClientIp(request),
    });

    // Mismo criterio que al activar 2FA (ver .../confirm/route.ts): si
    // alguien más tenía sesión abierta con esta cuenta, quitar el segundo
    // factor debe sacarlo de inmediato — sobre todo acá, donde justo se
    // está reduciendo la seguridad de la cuenta. Excluye la sesión actual.
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await verifySessionToken(token) : null;
    if (payload) {
      await revokeOtherSessions(session.id, payload.sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST 2FA Disable Error]", error);
    return NextResponse.json({ error: "Error al desactivar 2FA." }, { status: 500 });
  }
}
