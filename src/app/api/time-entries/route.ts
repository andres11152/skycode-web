import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getUserTimeEntries, createTimeEntry, deleteTimeEntry } from "@/lib/queries/timeEntries";

/**
 * Registrar horas exige poder ver proyectos (`projects:read`) — no hay un
 * permiso `time:*` dedicado a propósito: el selector de proyecto del
 * formulario mostraría títulos y clientes a quien no debería verlos (ej.
 * traffiker, que no tiene `projects:read`). Restringir por esa misma
 * capacidad evita la fuga sin inventar un permiso nuevo.
 */
function canLogTime(role: string): boolean {
  return hasPermission(role, "projects:read");
}

const CreateTimeEntrySchema = z.object({
  project_id: z.number().int().positive(),
  sprint_id: z.number().int().positive().nullable().optional(),
  entry_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  hours: z.number().positive().max(24),
  description: z.string().trim().max(500).optional(),
  billable: z.boolean().optional(),
});

/**
 * GET /api/time-entries - Las horas del usuario autenticado, nada más.
 * Siempre las suyas por identidad (nunca las de otra persona), gateado
 * por `canLogTime`. El reporte con horas y costos de todo el equipo es
 * `/api/profitability` (profitability:read, solo admin).
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!canLogTime(auth.session.role)) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    const entries = await getUserTimeEntries(auth.session.id);
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error("❌ [API GET Time Entries Error]", error);
    return NextResponse.json({ error: "Error al obtener las horas." }, { status: 500 });
  }
}

/**
 * POST /api/time-entries - Registra horas propias contra un proyecto (y
 * opcionalmente un sprint).
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!canLogTime(session.role)) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    const parsed = CreateTimeEntrySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de registro de horas inválidos." }, { status: 400 });
    }

    const created = await createTimeEntry(session.id, parsed.data);
    if (!created) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    const entries = await getUserTimeEntries(session.id);
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error("❌ [API POST Time Entry Error]", error);
    return NextResponse.json({ error: "Error al registrar las horas." }, { status: 500 });
  }
}

/**
 * DELETE /api/time-entries?id=123 - Borra un registro propio. Un admin
 * puede borrar cualquiera (corregir un registro erróneo de otra persona).
 */
export async function DELETE(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!canLogTime(session.role)) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "ID de registro inválido." }, { status: 400 });
  }

  try {
    const deleted = await deleteTimeEntry(id, session.id, session.role === "admin");
    if (!deleted) {
      return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API DELETE Time Entry Error]", error);
    return NextResponse.json({ error: "Error al eliminar el registro." }, { status: 500 });
  }
}

