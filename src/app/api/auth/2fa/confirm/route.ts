import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { verifySessionToken } from "@/lib/session";
import { confirmTotpSetup } from "@/lib/queries/totp";
import { revokeOtherSessions } from "@/lib/queries/sessions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { logError } from "@/lib/logger";

const ConfirmSchema = z.object({ code: z.string().trim().length(6) });

/**
 * POST /api/auth/2fa/confirm - Segundo paso de la configuración: el
 * usuario ya escaneó el QR de `POST /api/auth/2fa/setup` y manda el
 * primer código real de su app para probar que quedó bien configurado.
 * Recién acá `totp_enabled` pasa a `true` y se generan los códigos de
 * respaldo (devueltos en texto plano una sola vez).
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const parsed = ConfirmSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "El código debe tener 6 dígitos." }, { status: 400 });
    }

    const result = await confirmTotpSetup(session.id, parsed.data.code);
    if (!result.success) {
      return NextResponse.json({ error: "Código incorrecto. Verifica la hora de tu teléfono e intenta de nuevo." }, { status: 400 });
    }

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "user.2fa_enabled",
      entityType: "user",
      entityId: session.id,
      ip: getClientIp(request),
    });

    // Si alguien más tenía sesión abierta con esta cuenta (dispositivo
    // robado, sesión olvidada), activar 2FA ahora debe sacarlo de
    // inmediato en vez de dejarlo con acceso hasta que expire por su
    // cuenta — ver el comentario largo en revokeOtherSessions(). Excluye
    // la sesión ACTUAL (la de quien acaba de confirmar el QR) para no
    // dejarla fuera de su propio dashboard.
    const token = (await cookies()).get("skycode_session")?.value;
    const payload = token ? await verifySessionToken(token) : null;
    if (payload) {
      await revokeOtherSessions(session.id, payload.sessionId);
    }

    return NextResponse.json({ success: true, backupCodes: result.backupCodes });
  } catch (error) {
    logError("❌ [API POST 2FA Confirm Error]", error);
    return NextResponse.json({ error: "Error al confirmar 2FA." }, { status: 500 });
  }
}
