import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { findUserByEmail, createSessionRecord } from "@/lib/queries/auth";
import { findValidInvite, acceptTeamInviteAndCreateUser } from "@/lib/queries/team";
import { SESSION_LIFETIME_MS } from "@/lib/authService";
import { logError } from "@/lib/logger";

const AcceptInviteSchema = z.object({
  token: z.uuid(),
  name: z.string().trim().min(1).max(255),
  password: z.string().min(12).max(200),
});

/**
 * POST /api/team/accept - Activa una invitación de equipo: crea la cuenta
 * y deja a la persona con sesión iniciada, igual que /api/auth/login.
 * Público (nadie tiene cuenta todavía en este flujo).
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`team-accept:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const parsed = AcceptInviteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nombre y contraseña son requeridos (mínimo 12 caracteres)." },
        { status: 400 }
      );
    }
    const { token, name, password } = parsed.data;

    const invite = await findValidInvite(token);
    if (!invite) {
      return NextResponse.json({ error: "La invitación no existe, ya fue usada o expiró." }, { status: 400 });
    }

    const existingUser = await findUserByEmail(invite.email);
    if (existingUser) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await withTransaction(async (client) => {
      const newUser = await acceptTeamInviteAndCreateUser(
        {
          token,
          name,
          email: invite.email,
          passwordHash,
          role: invite.role,
        },
        client
      );

      await logAudit(client.query.bind(client), {
        actorId: newUser.id,
        actorEmail: newUser.email,
        action: "team.accept_invite",
        entityType: "user",
        entityId: newUser.id,
        diff: { after: newUser },
        ip,
      });

      return newUser;
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

    const response = NextResponse.json({ success: true, user });
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
    logError("❌ [API POST Team Accept Error]", error);
    return NextResponse.json({ error: "Error al activar la invitación." }, { status: 500 });
  }
}

