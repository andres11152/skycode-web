import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { getTasksAssignedToUser } from "@/lib/queries/tasks";
import { logError } from "@/lib/logger";

/**
 * GET /api/tasks/mine - Todo lo asignado a la sesión actual, cruzando
 * todos los proyectos (ver lib/queries/tasks.ts::getTasksAssignedToUser).
 * Mismo permiso que el resto de Tareas (`tasks:read`) — no hay una ruta
 * pública de "mis tareas" sin ese permiso, porque hoy ningún rol sin
 * `tasks:read` tiene forma de ver siquiera la página de un proyecto donde
 * se le asignó algo (esa página ya exige `projects:read` + `tasks:read`
 * para mostrar el tablero de tareas).
 */
export const GET = withAuth("tasks:read", async (_request, { session }) => {
  try {
    const tasks = await getTasksAssignedToUser(session.id);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    logError("❌ [API GET Tasks Mine Error]", error);
    return NextResponse.json({ error: "Error al obtener tus tareas." }, { status: 500 });
  }
});
