import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { isValidRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getTeamMembers, updateTeamMember } from "@/lib/queries/team";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const UpdateTeamMemberSchema = z.object({
  id: z.number().int().positive(),
  role: z.string().trim().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  hourlyCost: z.number().nonnegative().max(1_000_000).nullable().optional(),
  hourlyCostCurrency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
});

/**
 * GET /api/team - Lista el equipo interno (no clientes de portal).
 * Requiere permiso team:read (solo admin).
 */
export const GET = withAuth("team:read", async () => {
  try {
    const members = await getTeamMembers();
    return NextResponse.json({ success: true, members });
  } catch (error) {
    logError("❌ [API GET Team Error]", error);
    return NextResponse.json({ error: "Error al obtener el equipo." }, { status: 500 });
  }
});

/**
 * PATCH /api/team - Cambia el rol, el estado, o el costo por hora de un
 * miembro del equipo. Requiere permiso team:write (solo admin). El costo
 * por hora es lo que consume el reporte de rentabilidad para valorizar
 * horas registradas — nunca lo ve nadie fuera de admin.
 *
 * Al desactivar a alguien, se revocan de inmediato todas sus sesiones
 * activas en `sessions` — el efecto real puede tardar hasta los 15s de la
 * caché en memoria de `resolveSession()` (ver lib/authSession.ts), igual
 * que cualquier otro cambio de rol o estado.
 */
export const PATCH = withAuth("team:write", async (request, { session }) => {
  try {
    const parsed = UpdateTeamMemberSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de solicitud inválidos." }, { status: 400 });
    }
    const { id, role, status, hourlyCost, hourlyCostCurrency } = parsed.data;

    if (role === undefined && status === undefined && hourlyCost === undefined && hourlyCostCurrency === undefined) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }
    if (role !== undefined && !isValidRole(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }
    if (
      String(id) === String(session.id) &&
      ((status !== undefined && status !== "active") || (role !== undefined && role !== "admin"))
    ) {
      return NextResponse.json(
        { error: "No puedes desactivarte ni quitarte el rol de admin a ti mismo." },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    const member = await withTransaction(async (client) => {
      const result = await updateTeamMember({ id, role, status, hourlyCost, hourlyCostCurrency }, client);
      if (!result) return null;

      const { before, after } = result;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "team.update",
        entityType: "user",
        entityId: id,
        diff: { before, after },
        ip,
      });

      return after;
    });

    if (!member) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      member: { ...member, hourly_cost: member.hourly_cost !== null ? Number(member.hourly_cost) : null },
    });
  } catch (error) {
    logError("❌ [API PATCH Team Error]", error);
    return NextResponse.json({ error: "Error al actualizar el miembro del equipo." }, { status: 500 });
  }
});

