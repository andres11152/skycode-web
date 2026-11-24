import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/withAuth";
import { logAuditBestEffort } from "@/lib/audit";
import { query } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { changeClientEmail, createClient, getClientsPage, updateClient } from "@/lib/queries/clients";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { logError } from "@/lib/logger";

const UpdateClientSchema = z.object({
  id: z.number().int().positive(),
  email: z.email().trim().max(254).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  company: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(5000).optional(),
});

/**
 * GET /api/clients - Directorio de clientes con agregados (proyectos,
 * facturado, saldo pendiente). Requiere clients:read. Paginado en SQL,
 * mismo patrón que /api/leads — nunca trae la tabla completa al navegador.
 */
export const GET = withAuth("clients:read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = 15;

    const usdToCopRate = await getUsdToCopRate();
    const { clients, total } = await getClientsPage({ q, page, pageSize, usdToCopRate });

    return NextResponse.json({ success: true, clients, total });
  } catch (error) {
    logError("❌ [API GET Clients Error]", error);
    return NextResponse.json({ error: "Error al obtener clientes." }, { status: 500 });
  }
});

/**
 * PATCH /api/clients - Edita los datos de un cliente, incluido el correo (con sus reglas en
 * `changeClientEmail`: propuestas y accesos coherentes, nunca con cuenta de portal activa). Requiere clients:write.
 */
export const PATCH = withAuth("clients:write", async (request, { session }) => {
  try {
    const parsed = UpdateClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de solicitud inválidos." }, { status: 400 });
    }
    const { id, email, ...data } = parsed.data;

    if (email === undefined && Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (email !== undefined) {
      const change = await changeClientEmail(id, email);
      if (change.status === "not_found") return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
      if (change.status === "email_taken") {
        return NextResponse.json({ error: "Ya existe otro cliente con ese correo." }, { status: 409 });
      }
      if (change.status === "has_portal_user") {
        return NextResponse.json(
          { error: "Este cliente ya tiene una cuenta de portal activa; su correo de acceso no se puede cambiar desde aquí." },
          { status: 409 }
        );
      }
      if (change.status === "ok") {
        await logAuditBestEffort(query, {
          actorId: session.id,
          actorEmail: session.email,
          action: "client.change_email",
          entityType: "client",
          entityId: id,
          diff: { before: { email: change.before }, after: { email: change.after, revokedInvites: change.revokedInvites, updatedProposals: change.updatedProposals } },
          ip,
        });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true });
    }

    const result = await updateClient(id, data, { query });
    if (!result) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    await logAuditBestEffort(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "client.update",
      entityType: "client",
      entityId: id,
      diff: result,
      ip,
    });

    return NextResponse.json({ success: true, client: result.after });
  } catch (error) {
    logError("❌ [API PATCH Client Error]", error);
    return NextResponse.json({ error: "Error al actualizar el cliente." }, { status: 500 });
  }
});

const CreateClientSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.email().trim().max(254),
  company: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
});

/**
 * POST /api/clients - Crea un cliente a mano (por ejemplo para darle acceso al portal antes de su primer
 * proyecto). Requiere clients:write. 409 si ya existe un cliente con ese correo.
 */
export const POST = withAuth("clients:write", async (request, { session }) => {
  try {
    const parsed = CreateClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Nombre o correo inválido." }, { status: 400 });
    }

    const client = await createClient(parsed.data, { query });
    if (!client) {
      return NextResponse.json({ error: "Ya existe un cliente con ese correo." }, { status: 409 });
    }

    await logAuditBestEffort(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "client.create",
      entityType: "client",
      entityId: client.id,
      diff: { after: client },
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error) {
    logError("❌ [API POST Clients Error]", error);
    return NextResponse.json({ error: "Error al crear el cliente." }, { status: 500 });
  }
});
