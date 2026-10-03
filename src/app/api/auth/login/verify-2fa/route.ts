import { NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rateLimit";
import { verifyTwoFactorAndCreateSession } from "@/lib/authService";
import { verifyPendingTwoFactorToken } from "@/lib/session";
import { guardAuthRequest, recordAuthFailure, recordAuthSuccess, verifyHumanChallenge } from "@/lib/authShield";
import { setSessionCookie } from "@/lib/sessionCookie";
import { logError } from "@/lib/logger";

const Verify2faSchema = z.object({
  pendingToken: z.string().min(1).max(2000),
  code: z.string().trim().min(1).max(20),
});

const INVALID_CODE = { error: "Código inválido o expirado." };

/**
 * POST /api/auth/login/verify-2fa - Segundo paso del login cuando
 * `POST /api/auth/login` respondió `needsTwoFactor: true`. Acepta un
 * código TOTP de 6 dígitos o un código de respaldo (ver
 * lib/queries/totp.ts::verifyTotpOrBackupCode).
 *
 * Un código de 6 dígitos tiene muchísima menos entropía que una
 * contraseña (1 en un millón) — por eso, además de los límites de abajo
 * (por IP y, dentro de `verifyTwoFactorAndCreateSession`, por usuario) y de
 * la expiración de 5 min del `pendingToken`, cada intento exige su propio
 * proof-of-work y los fallos suben la dificultad (ver lib/authShield.ts).
 */
export async function POST(request: Request) {
  try {
    const guard = await guardAuthRequest(request, "verify-2fa");
    if (!guard.ok) return guard.response;
    const { ip, body } = guard;

    if (await isRateLimited(`login-2fa:${ip}`, 8, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiados intentos. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const parsed = Verify2faSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    // El `pendingToken` es JWT firmado (verificación de CPU, sin base): si no
    // es válido ni vale la pena pedir el proof-of-work.
    const userId = await verifyPendingTwoFactorToken(parsed.data.pendingToken);
    if (userId === null) return NextResponse.json(INVALID_CODE, { status: 401 });
    const identifier = `user:${userId}`;

    const gate = await verifyHumanChallenge({ surface: "verify-2fa", ip, identifier, body });
    if (!gate.ok) {
      if (gate.kind === "pow") return gate.response;
      return NextResponse.json(INVALID_CODE, { status: 401 });
    }

    const result = await verifyTwoFactorAndCreateSession({
      pendingToken: parsed.data.pendingToken,
      code: parsed.data.code,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    if (!result) {
      await recordAuthFailure({ surface: "verify-2fa", ip, identifier });
      return NextResponse.json(INVALID_CODE, { status: 401 });
    }

    await recordAuthSuccess({ surface: "verify-2fa", ip, identifier });

    const response = NextResponse.json({ success: true, user: result.user });
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    logError("❌ [API Verify 2FA Error]", error);
    return NextResponse.json({ error: "Error de servidor al procesar la autenticación." }, { status: 500 });
  }
}
