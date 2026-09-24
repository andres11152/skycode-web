import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { verifyTwoFactorAndCreateSession, SESSION_LIFETIME_MS } from "@/lib/authService";
import { logError } from "@/lib/logger";

const Verify2faSchema = z.object({
  pendingToken: z.string().min(1).max(2000),
  code: z.string().trim().min(1).max(20),
});

/**
 * POST /api/auth/login/verify-2fa - Segundo paso del login cuando
 * `POST /api/auth/login` respondió `needsTwoFactor: true`. Acepta un
 * código TOTP de 6 dígitos o un código de respaldo (ver
 * lib/queries/totp.ts::verifyTotpOrBackupCode).
 *
 * Un código de 6 dígitos tiene muchísima menos entropía que una
 * contraseña (1 en un millón) — el límite por IP de abajo es
 * deliberadamente más estricto que el del login normal (5 intentos en 10
 * minutos igual, pero acá cada intento vale mucho más porque el espacio
 * de búsqueda es diminuto). El `pendingToken` en sí ya expira a los 5
 * minutos (ver lib/session.ts), lo que también acota la ventana de
 * fuerza bruta.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`login-2fa:${ip}`, 8, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const parsed = Verify2faSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const result = await verifyTwoFactorAndCreateSession({
      pendingToken: parsed.data.pendingToken,
      code: parsed.data.code,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    if (!result) {
      return NextResponse.json({ error: "Código inválido o expirado." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });

    response.cookies.set({
      name: "skycode_session",
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_LIFETIME_MS / 1000,
      path: "/",
    });

    return response;
  } catch (error) {
    logError("❌ [API Verify 2FA Error]", error);
    return NextResponse.json({ error: "Error de servidor al procesar la autenticación." }, { status: 500 });
  }
}
