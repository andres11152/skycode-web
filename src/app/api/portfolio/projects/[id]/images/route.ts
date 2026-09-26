import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { addPortfolioProjectImage } from "@/lib/queries/portfolio";
import { processAndUploadPortfolioImage } from "@/lib/portfolioStorage";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

/**
 * POST /api/portfolio/projects/[id]/images - Sube una imagen a un caso de
 * portafolio (`multipart/form-data`, campo `file`). Requiere
 * `portfolio:write` (admin) — a diferencia de `/api/documents`, acá no
 * hay camino de cliente: el portafolio es contenido de marca, no algo que
 * un cliente externo suba.
 *
 * El procesamiento (`processAndUploadPortfolioImage`, ver
 * lib/portfolioStorage.ts) valida el contenido real del archivo con
 * `sharp` — nunca la extensión ni el `Content-Type` del navegador — y
 * genera las 3 variantes ANTES de tocar la base de datos. Si el `INSERT`
 * de `portfolio_project_images` fallara después, las variantes quedarían
 * huérfanas en el bucket público (aceptable: sin fila que las referencie,
 * nunca se listan en ningún lado — mismo criterio que documentos).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const projectId = parseProjectId((await params).id);
  if (projectId === null) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debe adjuntar un archivo." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAndUploadPortfolioImage(buffer);

    const ip = getClientIp(request);
    const created = await withTransaction(async (client) => {
      const result = await addPortfolioProjectImage(
        projectId,
        { storageKey: processed.storageKey, variants: processed.variants, width: processed.width, height: processed.height },
        client
      );

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "portfolio.image.upload",
        entityType: "portfolio_project",
        entityId: projectId,
        diff: { after: { imageId: result.id, storageKey: processed.storageKey } },
        ip,
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      image: {
        id: created.id,
        variants: processed.variants,
        width: processed.width,
        height: processed.height,
        alt: {},
        sortOrder: created.sortOrder,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la imagen.";
    const isValidationError = message.includes("Formato de imagen") || message.includes("tamaño máximo");
    if (!isValidationError) logError("❌ [API POST Portfolio Image Error]", error);
    return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 });
  }
}
