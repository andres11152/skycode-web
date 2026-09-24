import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { startTotpSetup } from "@/lib/queries/totp";
import { buildOtpauthUri } from "@/lib/totp";
import QRCode from "qrcode";
import { logError } from "@/lib/logger";

/**
 * POST /api/auth/2fa/setup - Genera un secreto TOTP nuevo para el usuario
 * autenticado y lo guarda como pendiente (`totp_enabled` sigue en
 * `false` hasta `POST /api/auth/2fa/confirm`) — autogestión pura, sin
 * permiso RBAC, cualquier sesión puede configurar su propio segundo
 * factor (mismo criterio que registrar horas propias o revocar sesiones
 * propias, ver CLAUDE.md).
 */
export async function POST() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const { secret } = await startTotpSetup(session.id);
    const otpauthUri = buildOtpauthUri({ secret, accountLabel: session.email });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });

    return NextResponse.json({ success: true, secret, otpauthUri, qrCodeDataUrl });
  } catch (error) {
    logError("❌ [API POST 2FA Setup Error]", error);
    return NextResponse.json({ error: "Error al iniciar la configuración de 2FA." }, { status: 500 });
  }
}
