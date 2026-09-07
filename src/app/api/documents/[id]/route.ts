import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { softDeleteDocument } from "@/lib/queries/documents";
import { deleteDocumentFile } from "@/lib/storage";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseDocumentId(id: string): number | null {
  const documentId = Number(id);
  return Number.isInteger(documentId) && documentId > 0 ? documentId : null;
}

/**
 * DELETE /api/documents/[id] - Borrado lógico de la fila + borrado físico
 * del archivo en disco. Requiere `documents:write`. El orden importa: la
 * fila se marca borrada primero (dentro de una transacción con el audit
 * log), y el archivo físico se borra después de que la transacción
 * confirma — si el borrado del archivo fallara, la fila ya quedó
 * consistente como borrada (preferible a un archivo huérfano invisible
 * antes que a una fila borrada apuntando a un archivo que sigue ahí).
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "documents:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const documentId = parseDocumentId((await params).id);
  if (documentId === null) {
    return NextResponse.json({ error: "ID de documento inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const result = await softDeleteDocument(documentId, client);
      if (!result) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "document.delete",
        entityType: "document",
        entityId: documentId,
        ip,
      });

      return result;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    }

    await deleteDocumentFile(deleted.storage_key);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Document Error]", error);
    return NextResponse.json({ error: "Error al eliminar el documento." }, { status: 500 });
  }
}
