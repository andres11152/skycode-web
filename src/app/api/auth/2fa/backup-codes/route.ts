import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { regenerateBackupCodes } from "@/lib/queries/totp";
import { logAuditBestEffort } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { logError } from "@/lib/logger";

const RegenerateSchema = z.object({ code: z.string().trim().min(1).max(20) });

/**
 * POST /api/auth/2fa/backup-codes - Reemplaza todos los códigos de
 * respaldo (los viejos quedan inválidos de inmediato) — para cuando el
 * usuario los va gastando o simplemente perdió dónde los guardó. Exige un
 * código válido actual, mismo criterio que desactivar 2FA.
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
    const parsed = RegenerateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Código requerido." }, { status: 400 });
    }

    const backupCodes = await regenerateBackupCodes(session.id, parsed.data.code);
    if (!backupCodes) {
      return NextResponse.json({ error: "Código incorrecto." }, { status: 400 });
    }

    await logAuditBestEffort(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "user.2fa_backup_codes_regenerated",
      entityType: "user",
      entityId: session.id,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true, backupCodes });
  } catch (error) {
    logError("❌ [API POST 2FA Backup Codes Error]", error);
    return NextResponse.json({ error: "Error al regenerar los códigos." }, { status: 500 });
  }
}
