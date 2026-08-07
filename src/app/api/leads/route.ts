import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import {
  getActiveLeadsPage,
  createLead,
  updateLeadStatusAndOwner,
  softDeleteLead,
  addLeadActivity,
} from "@/lib/queries/leads";
import { AttributionFieldsSchema } from "@/lib/attributionSchema";

const LeadStatusSchema = z.enum(["Nuevo", "En Cotización", "Ganado", "Perdido"]);

const CreateLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.email().trim().max(254),
    phone: z.string().trim().max(50).optional(),
    service: z.string().trim().max(255).optional(),
    budget: z.string().trim().max(100).optional(),
    currency: z.string().trim().max(10).optional(),
    estimatedWeeks: z.number().int().min(1).max(104).optional(),
    message: z.string().trim().max(5000).optional(),
    source: z.string().trim().max(100).optional(),
  })
  .extend(AttributionFieldsSchema.shape);

const UpdateLeadSchema = z.object({
  id: z.number().int().positive(),
  status: LeadStatusSchema.optional(),
  ownerId: z.number().int().positive().nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
});

/**
 * GET /api/leads - Lista prospectos con búsqueda, filtro por estado y
 * paginación resueltos en SQL. Requiere permiso leads:read.
 */
export const GET = withAuth("leads:read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

    const { leads, total } = await getActiveLeadsPage({ q, status, page, pageSize });
    return NextResponse.json({ success: true, leads, total, page, pageSize });
  } catch (error) {
    console.error("❌ [API GET Leads Error]", error);
    return NextResponse.json({ error: "Error de servidor al obtener prospectos." }, { status: 500 });
  }
});

/**
 * POST /api/leads - Inserta un nuevo lead en PostgreSQL cuando un cliente cotiza o contacta.
 * Público (llamado desde la web).
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`leads:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const parsed = CreateLeadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de solicitud inválidos." }, { status: 400 });
    }

    const lead = await createLead(parsed.data);

    console.log("📥 [Nuevo Lead Registrado en PostgreSQL]", lead);

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("❌ [API POST Lead Error]", error);
    return NextResponse.json({ error: "Error al guardar el prospecto." }, { status: 500 });
  }
}

/**
 * PATCH /api/leads - Cambia el estado o el dueño de un lead. Requiere
 * permiso leads:write. Un cambio de estado deja además una entrada
 * automática en `lead_activities` (tipo status_change), para que el
 * historial del lead sea un timeline único sin tener que cruzar con
 * audit_log.
 */
export const PATCH = withAuth("leads:write", async (request, { session }) => {
  try {
    const parsed = UpdateLeadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de solicitud inválidos." }, { status: 400 });
    }
    const { id, status, ownerId, campaignId } = parsed.data;

    if (status === undefined && ownerId === undefined && campaignId === undefined) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    const ip = getClientIp(request);

    const lead = await withTransaction(async (client) => {
      const result = await updateLeadStatusAndOwner({ id, status, ownerId, campaignId }, client);
      if (!result) return null;

      const { before, after } = result;

      if (status !== undefined && status !== before.status) {
        await addLeadActivity(
          {
            leadId: id,
            actorId: session.id,
            actorName: session.name,
            type: "status_change",
            body: `${before.status} → ${status}`,
          },
          client
        );
      }

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "lead.update",
        entityType: "lead",
        entityId: id,
        diff: { before, after },
        ip,
      });

      return after;
    });

    if (!lead) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("❌ [API PATCH Lead Error]", error);
    return NextResponse.json({ error: "Error al actualizar prospecto." }, { status: 500 });
  }
});

/**
 * DELETE /api/leads?id=123 - Borrado lógico (deleted_at), nunca físico.
 * Requiere permiso leads:write (admin y sales_manager).
 */
export const DELETE = withAuth("leads:write", async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID de prospecto inválido." }, { status: 400 });
    }

    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const row = await softDeleteLead(id, client);
      if (!row) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "lead.delete",
        entityType: "lead",
        entityId: id,
        diff: { before: row },
        ip,
      });

      return row;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API DELETE Lead Error]", error);
    return NextResponse.json({ error: "Error al eliminar prospecto." }, { status: 500 });
  }
});

