import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getDocumentFileRow, isDocumentOwnedByClient } from "@/lib/queries/documents";
import { readDocumentFile } from "@/lib/storage";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Arma un `Content-Disposition` seguro a partir de un nombre de archivo
 * que vino del usuario en el upload (`original_filename`, guardado tal
 * cual en la base). Nunca se interpola directo en el header — un nombre
 * con `"` o un salto de línea podría inyectar parámetros/headers extra.
 * `filename*` (RFC 5987, percent-encoded) es lo que usan los navegadores
 * modernos; `filename` con comillas escapadas es el respaldo para el resto.
 */
function contentDisposition(originalFilename: string): string {
  const safeAscii = originalFilename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(originalFilename);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

/**
 * GET /api/documents/[id]/download - Descarga el archivo. Requiere
 * `documents:read`, O ser el cliente dueño del proyecto de ese documento
 * (acceso desde `/portal`, por dueño, no por permiso). Streamea el buffer
 * leído del disco con el `Content-Type` original guardado en la base,
 * nunca inferido del nombre.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const documentId = Number((await params).id);
  if (!Number.isInteger(documentId) || documentId <= 0) {
    return NextResponse.json({ error: "ID de documento inválido." }, { status: 400 });
  }

  const isOwnerClient = session.role === "client" && session.clientId && (await isDocumentOwnedByClient(documentId, session.clientId));
  if (!hasPermission(session.role, "documents:read") && !isOwnerClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    const doc = await getDocumentFileRow(documentId);
    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    }

    const buffer = await readDocumentFile(doc.storage_key);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.mime_type,
        "Content-Disposition": contentDisposition(doc.original_filename),
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    logError("❌ [API GET Document Download Error]", error);
    return NextResponse.json({ error: "Error al descargar el documento." }, { status: 500 });
  }
}
