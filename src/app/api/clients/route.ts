import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { getClientsPage, updateClient } from "@/lib/queries/clients";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { logError } from "@/lib/logger";

const UpdateClientSchema = z.object({
  id: z.number().int().positive(),
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
 * PATCH /api/clients - Edita los datos de contacto de un cliente (nunca
 * el email, ver lib/queries/clients.ts). Requiere clients:write.
 */
export const PATCH = withAuth("clients:write", async (request, { session }) => {
  try {
    const parsed = UpdateClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de solicitud inválidos." }, { status: 400 });
    }
    const { id, ...data } = parsed.data;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    const result = await updateClient(id, data, { query });
    if (!result) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "client.update",
      entityType: "client",
      entityId: id,
      diff: result,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true, client: result.after });
  } catch (error) {
    logError("❌ [API PATCH Client Error]", error);
    return NextResponse.json({ error: "Error al actualizar el cliente." }, { status: 500 });
  }
});
