import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { isInvoiceOwnedByClient } from "@/lib/queries/boldPayments";
import { getInvoiceForPdf } from "@/lib/queries/invoices";
import { generateInvoicePdfBuffer } from "@/lib/invoicePdf";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/pdf - Descarga el PDF de una factura. Dos
 * caminos, mismo criterio que documentos/comentarios de sprint: equipo
 * interno con `invoices:read` ve cualquier factura; un cliente descarga
 * solo las de sus propios proyectos vía `isInvoiceOwnedByClient()`
 * (reutilizada de `boldPayments.ts`, no una segunda copia del chequeo).
 * 404, no 403, si no es su factura — no confirmar que existe.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const invoiceId = Number((await params).id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "ID de factura inválido." }, { status: 400 });
  }

  const canRead = hasPermission(session.role, "invoices:read");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canRead && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    if (isClient && !(await isInvoiceOwnedByClient(invoiceId, session.clientId!))) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const invoice = await getInvoiceForPdf(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Factura-${invoice.invoice_number}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    logError("❌ [API GET Invoice PDF Error]", error);
    return NextResponse.json({ error: "Error al generar el PDF." }, { status: 500 });
  }
}
