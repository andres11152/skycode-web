import { NextResponse } from "next/server";
import { Resend } from "resend";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAuditBestEffort } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { findUserByEmail } from "@/lib/queries/auth";
import { createTeamInvite } from "@/lib/queries/team";
import { getClientForPortalInvite } from "@/lib/queries/clients";
import { publicOrigin } from "@/lib/publicOrigin";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 días: un cliente tarda más en activar que el equipo

/**
 * POST /api/clients/[id]/portal-invite - Invita al correo del cliente a su portal (`/portal`): proyectos, tickets
 * de soporte, documentos, facturas y aprobación de entregables. Crea una invitación de un solo uso con
 * `role = 'client'` y `client_id`, así el usuario que se cree ve SOLO lo de ese cliente. Requiere clients:write.
 * Devuelve el enlace además de enviarlo por correo (respaldo si el correo no llega).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "clients:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const clientId = Number((await params).id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "ID de cliente inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`client-portal-invite:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas invitaciones enviadas. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const client = await getClientForPortalInvite(clientId);
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    const email = client.email.toLowerCase();
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: "Este cliente ya tiene una cuenta con ese correo." }, { status: 409 });
    }

    const inviteId = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
    await createTeamInvite({ id: inviteId, email, role: "client", invitedBy: session.id, expiresAt, clientId: client.id });

    await logAuditBestEffort(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "client.portal_invite",
      entityType: "client",
      entityId: client.id,
      diff: { after: { email, inviteId } },
      ip,
    });

    const inviteUrl = `${publicOrigin(request)}/invitar/${inviteId}`;

    let emailSent = false;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey && apiKey.startsWith("re_") && apiKey !== "your_resend_api_key_here") {
      try {
        const resend = new Resend(apiKey);
        const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";
        const { error } = await resend.emails.send({
          from: fromAddress,
          to: email,
          subject: "Tu acceso al portal de clientes de SKYCODE Agency",
          text: `Hola ${client.name},\n\nTe creamos acceso al portal de clientes de SKYCODE Agency. Desde ahí puedes ver el avance de tus proyectos, abrir tickets de soporte, subir documentos, revisar facturas y aprobar entregables.\n\nActiva tu cuenta acá (válido por 7 días):\n${inviteUrl}\n\nSi no esperabas este correo, puedes ignorarlo.`,
        });
        if (error) logError("⚠️ [Client Portal Invite Resend Rejected]", error, { to: email });
        else emailSent = true;
      } catch (emailErr) {
        logError("⚠️ [Client Portal Invite Resend Warning]", emailErr);
      }
    }

    return NextResponse.json({ success: true, inviteUrl, expiresAt, emailSent, email });
  } catch (error) {
    logError("❌ [API POST Client Portal Invite Error]", error);
    return NextResponse.json({ error: "Error al crear la invitación." }, { status: 500 });
  }
}
