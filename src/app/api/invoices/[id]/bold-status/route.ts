import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { isInvoiceOwnedByClient, recordBoldPaymentIfNew } from "@/lib/queries/boldPayments";
import { fetchBoldPaymentVoucher, parseInvoiceIdFromBoldOrderId } from "@/lib/bold";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/bold-status?orderId=... - Confirma el resultado
 * real de un pago al volver del checkout de Bold (PortalView.tsx llama
 * esto cuando la URL trae `?bold-order-id=...` tras la redirección). Nunca
 * confía en el `bold-tx-status` de la URL —eso lo puede editar cualquiera
 * a mano— sino que consulta el estado real contra la API de Bold
 * (`fetchBoldPaymentVoucher`, ver lib/bold.ts) y solo entonces registra el
 * pago, de forma idempotente (`recordBoldPaymentIfNew`).
 *
 * Es un respaldo del webhook (`POST /api/webhooks/bold`), no lo
 * reemplaza: si el webhook ya registró el pago primero, esta ruta no
 * hace nada (mismo `provider_reference`, `inserted: false`) — y si el
 * webhook falla en llegar (URL mal configurada en el panel de Bold,
 * caída puntual de red), esta sigue siendo la vía normal de un cliente
 * que sí espera en pantalla a que el pago se confirme.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (session.role !== "client" || !session.clientId) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const invoiceId = Number((await params).id);
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!Number.isInteger(invoiceId) || invoiceId <= 0 || !orderId) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  // El order-id codifica su propia factura (ver buildBoldOrderId) — si no
  // calza con el `[id]` de la ruta, alguien está mezclando un order-id de
  // otra factura/cliente a mano. Se rechaza antes de tocar la base.
  if (parseInvoiceIdFromBoldOrderId(orderId) !== invoiceId) {
    return NextResponse.json({ error: "El identificador de la transacción no corresponde a esta factura." }, { status: 400 });
  }

  try {
    const owned = await isInvoiceOwnedByClient(invoiceId, session.clientId);
    if (!owned) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const voucher = await fetchBoldPaymentVoucher(orderId);
    if (!voucher || voucher.payment_status !== "APPROVED") {
      return NextResponse.json({ success: true, status: voucher?.payment_status ?? "NO_TRANSACTION_FOUND" });
    }

    const result = await recordBoldPaymentIfNew({
      invoiceId,
      amount: voucher.total ?? 0,
      paidAt: new Date().toISOString().slice(0, 10),
      providerReference: voucher.transaction_id ?? orderId,
    });

    if (result.inserted) {
      await logAudit(query, {
        actorId: session.id,
        actorEmail: session.email,
        action: "invoice.payment",
        entityType: "invoice",
        entityId: invoiceId,
        diff: { after: { provider: "bold", orderId, amount: voucher.total } },
        ip: getClientIp(request),
      });
    }

    return NextResponse.json({ success: true, status: "APPROVED" });
  } catch (error) {
    logError("❌ [API GET Bold Status Error]", error);
    return NextResponse.json({ error: "Error al confirmar el pago." }, { status: 500 });
  }
}
