import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getClientDetail } from "@/lib/queries/clients";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseClientId(id: string): number | null {
  const clientId = Number(id);
  return Number.isInteger(clientId) && clientId > 0 ? clientId : null;
}

/**
 * GET /api/clients/[id] - Ficha 360 de un cliente: sus proyectos,
 * propuestas y facturas cruzadas en una vista. Requiere clients:read.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "clients:read")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const clientId = parseClientId((await params).id);
  if (clientId === null) {
    return NextResponse.json({ error: "ID de cliente inválido." }, { status: 400 });
  }

  try {
    const usdToCopRate = await getUsdToCopRate();
    const client = await getClientDetail(clientId, usdToCopRate);
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, client });
  } catch (error) {
    logError("❌ [API GET Client Detail Error]", error);
    return NextResponse.json({ error: "Error al obtener el cliente." }, { status: 500 });
  }
}
