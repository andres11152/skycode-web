import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { verifySessionToken } from "@/lib/session";
import { disableTotp } from "@/lib/queries/totp";
import { revokeOtherSessions } from "@/lib/queries/sessions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
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

  try {
    const parsed = DisableSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Código requerido." }, { status: 400 });
    }

    const disabled = await disableTotp(session.id, parsed.data.code);
    if (!disabled) {
      return NextResponse.json({ error: "Código incorrecto." }, { status: 400 });
    }

    await logAudit(query, {
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
    const token = (await cookies()).get("skycode_session")?.value;
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
