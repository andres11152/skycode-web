import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { logAudit, logAuditBestEffort } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { comparePassword, hashPassword } from "@/lib/auth";
import { PWNED_PASSWORD_MESSAGE, isPasswordPwned } from "@/lib/pwnedPasswords";
import { changeUserPassword, getUserPasswordHash } from "@/lib/queries/userProfile";
import { ChangePasswordSchema } from "@/lib/profileValidation";
import { logError } from "@/lib/logger";

/**
 * POST /api/account/password - Cambiar la contraseña propia estando
 * logueado. Antes no existía: el único camino era cerrar sesión y pedirse
 * un correo de recuperación.
 *
 * Exige la contraseña ACTUAL aunque la sesión ya esté abierta — tener una
 * pestaña abierta en una laptop desbloqueada un minuto no debería bastar
 * para quedarse con la cuenta de otra persona (mismo criterio que
 * desactivar 2FA, que exige un código válido).
 *
 * Rate limit por usuario Y por IP: el primero frena el adivinar la
 * contraseña actual desde una sesión robada (la IP puede rotar), el
 * segundo frena barrer muchas cuentas desde un mismo origen.
 *
 * Al terminar revoca TODAS las demás sesiones y deja viva solo esta: si
 * alguien cambia su contraseña porque sospecha que se la robaron, dejar
 * las otras sesiones abiertas haría inútil el cambio.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session, sessionId } = auth;

  try {
    const ip = getClientIp(request);
    const limited =
      (await isRateLimited(`change-password:user:${session.id}`, 5, 15 * 60 * 1000)) ||
      (await isRateLimited(`change-password:ip:${ip}`, 20, 15 * 60 * 1000));
    if (limited) {
      return NextResponse.json({ error: "Demasiados intentos. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const currentHash = await getUserPasswordHash(session.id);
    const isCurrentValid = currentHash ? await comparePassword(parsed.data.currentPassword, currentHash) : false;
    if (!isCurrentValid) {
      // Se audita el intento fallido (sin la contraseña probada, obviamente)
      // — varios seguidos desde una sesión son una señal de sesión robada.
      await logAuditBestEffort(query, {
        actorId: session.id,
        actorEmail: session.email,
        action: "user.password_change_failed",
        entityType: "user",
        entityId: session.id,
        ip,
      });
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
    }

    if (await isPasswordPwned(parsed.data.newPassword)) {
      return NextResponse.json({ error: PWNED_PASSWORD_MESSAGE }, { status: 400 });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await withTransaction(async (client) => {
      await changeUserPassword(session.id, newHash, sessionId, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "user.password_change",
        entityType: "user",
        entityId: session.id,
        ip,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Account Password Error]", error);
    return NextResponse.json({ error: "Error al cambiar la contraseña." }, { status: 500 });
  }
}
