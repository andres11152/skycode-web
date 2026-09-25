import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { isProjectOwnedByClient } from "@/lib/queries/supportTickets";
import { isOnboardingItemInProject, toggleOnboardingItem } from "@/lib/queries/onboarding";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

const ToggleSchema = z.object({ completed: z.boolean() });

/**
 * PATCH /api/projects/[id]/onboarding/[itemId] - Marca o desmarca un
 * ítem del checklist. Mismos dos caminos que el GET — a propósito
 * cualquiera de los dos lados puede marcar cualquier ítem, `responsible`
 * es solo orientativo (ver lib/queries/onboarding.ts), no una
 * restricción real: el equipo a veces marca por el cliente tras
 * confirmar algo por llamada.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const { id, itemId: itemIdRaw } = await params;
  const projectId = Number(id);
  const itemId = Number(itemIdRaw);
  if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const canWrite = hasPermission(session.role, "tasks:write");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canWrite && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const parsed = ToggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    if (isClient && !(await isProjectOwnedByClient(projectId, session.clientId!))) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }
    if (!(await isOnboardingItemInProject(itemId, projectId))) {
      return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
    }

    const toggled = await toggleOnboardingItem(itemId, parsed.data.completed, session.id);
    if (!toggled) {
      return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
    }

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: parsed.data.completed ? "onboarding_item.complete" : "onboarding_item.reopen",
      entityType: "onboarding_item",
      entityId: itemId,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Onboarding Item Error]", error);
    return NextResponse.json({ error: "Error al actualizar el ítem." }, { status: 500 });
  }
}
