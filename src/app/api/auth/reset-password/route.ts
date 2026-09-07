import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { findValidResetToken, consumeResetToken } from "@/lib/queries/passwordReset";
import { hashPassword } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";
import { createSessionRecord } from "@/lib/queries/auth";
import { logAudit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { SESSION_LIFETIME_MS } from "@/lib/authService";

const ResetSchema = z.object({
  token: z.uuid(),
  password: z.string().min(12).max(200),
});

/**
 * POST /api/auth/reset-password - Público (quien resetea todavía no tiene
 * sesión). Consume el token de un solo uso, rota la contraseña, revoca
 * todas las sesiones activas previas (`consumeResetToken`) y deja a la
 * persona logueada de una vez — mismo patrón que `/api/team/accept`.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`reset-password:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const parsed = ResetSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "El enlace no es válido o la contraseña debe tener al menos 12 caracteres." },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

    const reset = await findValidResetToken(token);
    if (!reset) {
      return NextResponse.json({ error: "El enlace no es válido, ya fue usado o expiró." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await withTransaction(async (client) => {
      await consumeResetToken({ token, userId: reset.userId, passwordHash }, client);

      const userRes = await client.query(
        `SELECT id, name, email, role FROM users WHERE id = $1;`,
        [reset.userId]
      );
      const userRow = userRes.rows[0];

      await logAudit(client.query.bind(client), {
        actorId: userRow.id,
        actorEmail: userRow.email,
        action: "user.reset_password",
        entityType: "user",
        entityId: userRow.id,
        ip,
      });

      return userRow;
    });

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    await createSessionRecord({
      id: sessionId,
      userId: user.id,
      expiresAt,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    const jwt = await createSessionToken({ sessionId });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set({
      name: "skycode_session",
      value: jwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_LIFETIME_MS / 1000,
      path: "/",
    });

    return response;
  } catch (error) {
    logError("❌ [API POST Reset Password Error]", error);
    return NextResponse.json({ error: "Error al restablecer la contraseña." }, { status: 500 });
  }
}
