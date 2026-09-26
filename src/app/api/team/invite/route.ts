import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { findUserByEmail } from "@/lib/queries/auth";
import { createTeamInvite } from "@/lib/queries/team";
import { logError } from "@/lib/logger";

const InviteSchema = z.object({
  email: z.email().trim().max(254),
  role: z.enum(["admin", "sales_manager", "traffiker"]),
});

const INVITE_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000; // 3 días

/**
 * POST /api/team/invite - Invita a alguien al equipo interno por correo,
 * con un enlace de un solo uso. Requiere permiso team:write (solo admin).
 * No admite role: "client" — eso es acceso de portal, no equipo interno.
 */
export const POST = withAuth("team:write", async (request, { session }) => {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`team-invite:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas invitaciones enviadas. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const parsed = InviteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo o rol inválido." }, { status: 400 });
    }
    const { email, role } = parsed.data;
    const emailNormalized = email.toLowerCase();

    const existingUser = await findUserByEmail(emailNormalized);
    if (existingUser) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 400 });
    }

    const inviteId = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
    await createTeamInvite({
      id: inviteId,
      email: emailNormalized,
      role,
      invitedBy: session.id,
      expiresAt,
    });

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "team.invite",
      entityType: "invite",
      entityId: inviteId,
      diff: { after: { email: emailNormalized, role } },
      ip,
    });

    const origin = new URL(request.url).origin;
    const inviteUrl = `${origin}/invitar/${inviteId}`;

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");

    if (!isDummyKey) {
      try {
        const resend = new Resend(apiKey);
        const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";
        await resend.emails.send({
          from: fromAddress,
          to: emailNormalized,
          subject: "Invitación al equipo de SKYCODE Agency",
          text: `${session.name} te invitó a unirte al panel interno de SKYCODE Agency con el rol "${role}".\n\nActiva tu cuenta acá (válido por 3 días):\n${inviteUrl}`,
        });
      } catch (emailErr) {
        logError("⚠️ [Team Invite Resend Warning]", emailErr);
      }
    }

    // El enlace se devuelve siempre, incluso si el correo se envió: quien
    // llama este endpoint ya tiene team:write, así que no es una fuga de
    // privilegio — y sirve de respaldo si el correo no llega.
    return NextResponse.json({ success: true, inviteUrl, expiresAt });
  } catch (error) {
    logError("❌ [API POST Team Invite Error]", error);
    return NextResponse.json({ error: "Error al crear la invitación." }, { status: 500 });
  }
});

