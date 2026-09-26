import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getProjectDocuments, getClientDocuments, createDocumentRecord } from "@/lib/queries/documents";
import { isProjectOwnedByClient } from "@/lib/queries/supportTickets";
import { saveDocumentFile, isAllowedDocumentExtension, matchesFileSignature } from "@/lib/storage";
import { logError } from "@/lib/logger";

// Cota generosa para contratos/specs escaneados sin abrir la puerta a
// subidas arbitrariamente grandes contra un disco de tamaño fijo.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * GET /api/documents?projectId=N - Documentos de UN proyecto (uso
 * interno, `/dashboard/proyectos/[id]`). Requiere `documents:read`.
 * GET /api/documents (sin `projectId`) - Documentos de TODOS los
 * proyectos del cliente logueado (uso desde `/portal`) — por dueño, no
 * por permiso, mismo criterio que `/api/projects`. Un admin/sales_manager
 * sin `projectId` recibe 400: esa forma es exclusiva del portal.
 */
export async function GET(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const projectIdRaw = searchParams.get("projectId");

    if (projectIdRaw === null) {
      if (session.role !== "client") {
        return NextResponse.json({ error: "projectId es requerido." }, { status: 400 });
      }
      const documents = session.clientId ? await getClientDocuments(session.clientId) : [];
      return NextResponse.json({ success: true, documents });
    }

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "projectId inválido." }, { status: 400 });
    }
    if (!hasPermission(session.role, "documents:read")) {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    const documents = await getProjectDocuments(projectId);
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    logError("❌ [API GET Documents Error]", error);
    return NextResponse.json({ error: "Error al obtener los documentos." }, { status: 500 });
  }
}

/**
 * POST /api/documents - Sube un documento a un proyecto (`multipart/form-data`,
 * campos `project_id` y `file`). Dos caminos, mismo criterio que
 * `POST /api/support-tickets`:
 *
 * - Con `documents:write` (admin/sales_manager): sube a cualquier proyecto.
 * - Sin ese permiso pero `role === "client"`: sube a UNO DE SUS PROPIOS
 *   proyectos (verificado con `isProjectOwnedByClient()`) — esta es la
 *   pieza de "Portal ampliado" que faltaba: el cliente podía descargar
 *   documentos desde `/portal` pero nunca subir los suyos (brief, logos,
 *   accesos). `uploaded_by` queda igual con `session.id` — un cliente SÍ
 *   tiene fila en `users` (con `client_id`, ver rbac.ts), así que no hace
 *   falta ningún cambio de esquema para saber quién subió qué.
 *
 * El archivo se guarda con un nombre generado server-side (ver
 * lib/storage.ts) — nunca el nombre original — y la fila de `documents` se
 * crea en la misma transacción que el registro de auditoría; si el
 * `INSERT` falla después de escribir el archivo, el archivo queda huérfano
 * en disco (aceptable: un archivo sin fila no se lista ni se sirve nunca,
 * y no es información sensible reconstruible sin el `storage_key`
 * aleatorio).
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const canWrite = hasPermission(session.role, "documents:write");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canWrite && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const projectIdRaw = formData.get("project_id");
    const file = formData.get("file");

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "project_id inválido." }, { status: 400 });
    }
    if (isClient && !(await isProjectOwnedByClient(projectId, session.clientId!))) {
      // 404, no 403 — mismo criterio que el resto del portal: no confirmar
      // que el proyecto existe si no es del cliente que llama.
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debe adjuntar un archivo." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 20 MB." }, { status: 400 });
    }
    if (!isAllowedDocumentExtension(file.name)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Use PDF, Office, imagen, ZIP, TXT o CSV." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Cierra la whitelist de extensiones contra un archivo renombrado (ej.
    // un ejecutable guardado como `informe.pdf`) — ver el comentario largo
    // en lib/storage.ts::matchesFileSignature.
    if (!matchesFileSignature(buffer, file.name)) {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con su extensión." },
        { status: 400 }
      );
    }

    const storageKey = await saveDocumentFile(buffer, file.name);

    const ip = getClientIp(request);

    const documentId = await withTransaction(async (client) => {
      const id = await createDocumentRecord(
        {
          project_id: projectId,
          original_filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          storage_key: storageKey,
        },
        session.id,
        client
      );

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "document.upload",
        entityType: "document",
        entityId: id,
        diff: { after: { project_id: projectId, original_filename: file.name, size_bytes: file.size } },
        ip,
      });

      return id;
    });

    const documents = await getProjectDocuments(projectId);
    const created = documents.find((d) => d.id === documentId);
    return NextResponse.json({ success: true, document: created });
  } catch (error) {
    logError("❌ [API POST Document Error]", error);
    return NextResponse.json({ error: "Error al subir el documento." }, { status: 500 });
  }
}
