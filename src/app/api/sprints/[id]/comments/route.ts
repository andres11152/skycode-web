import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getSprintComments, createSprintComment, isSprintOwnedByClient, sprintExists } from "@/lib/queries/sprintComments";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseSprintId(id: string): number | null {
  const sprintId = Number(id);
  return Number.isInteger(sprintId) && sprintId > 0 ? sprintId : null;
}

const CreateCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

/**
 * GET /api/sprints/[id]/comments - Historial de comentarios de un sprint.
 * Dos caminos, mismo criterio que `/api/documents`: equipo interno con
 * `tasks:read` ve cualquier sprint; un cliente ve solo los de sus propios
 * proyectos (`isSprintOwnedByClient`). 404, no 403, si no es su sprint —
 * no confirmar que existe.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const sprintId = parseSprintId((await params).id);
  if (sprintId === null) {
    return NextResponse.json({ error: "ID de sprint inválido." }, { status: 400 });
  }

  const canRead = hasPermission(session.role, "tasks:read");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canRead && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    if (isClient && !(await isSprintOwnedByClient(sprintId, session.clientId!))) {
      return NextResponse.json({ error: "Entregable no encontrado." }, { status: 404 });
    }
    if (canRead && !(await sprintExists(sprintId))) {
      return NextResponse.json({ error: "Entregable no encontrado." }, { status: 404 });
    }

    const comments = await getSprintComments(sprintId);
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    logError("❌ [API GET Sprint Comments Error]", error);
    return NextResponse.json({ error: "Error al obtener los comentarios." }, { status: 500 });
  }
}

/**
 * POST /api/sprints/[id]/comments - Agrega un comentario. Mismos dos
 * caminos que el GET — a diferencia de la aprobación (exclusiva del
 * cliente), comentar es de ambos lados: el cliente pregunta, el equipo
 * responde, sobre cualquier sprint (no solo los completados).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const sprintId = parseSprintId((await params).id);
  if (sprintId === null) {
    return NextResponse.json({ error: "ID de sprint inválido." }, { status: 400 });
  }

  const canWrite = hasPermission(session.role, "tasks:write");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canWrite && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const parsed = CreateCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "El comentario no puede estar vacío." }, { status: 400 });
  }

  try {
    if (isClient && !(await isSprintOwnedByClient(sprintId, session.clientId!))) {
      return NextResponse.json({ error: "Entregable no encontrado." }, { status: 404 });
    }
    if (canWrite && !(await sprintExists(sprintId))) {
      return NextResponse.json({ error: "Entregable no encontrado." }, { status: 404 });
    }

    const ip = getClientIp(request);
    const commentId = await withTransaction(async (client) => {
      const id = await createSprintComment(sprintId, session.id, parsed.data.body, client);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "sprint_comment.create",
        entityType: "sprint",
        entityId: sprintId,
        diff: { after: { body: parsed.data.body } },
        ip,
      });

      return id;
    });

    const comments = await getSprintComments(sprintId);
    const comment = comments.find((c) => c.id === commentId);
    return NextResponse.json({ success: true, comment });
  } catch (error) {
    logError("❌ [API POST Sprint Comment Error]", error);
    return NextResponse.json({ error: "Error al agregar el comentario." }, { status: 500 });
  }
}
