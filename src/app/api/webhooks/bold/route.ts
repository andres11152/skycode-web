import { NextResponse } from "next/server";
import { verifyBoldWebhookSignature, parseInvoiceIdFromBoldOrderId } from "@/lib/bold";
import { recordBoldPaymentIfNew } from "@/lib/queries/boldPayments";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { logError } from "@/lib/logger";

interface BoldWebhookEvent {
  type: string;
  data?: {
    payment_id?: string;
    created_at?: string;
    amount?: { total?: number; currency?: string };
    metadata?: { reference?: string };
  };
}

/**
 * POST /api/webhooks/bold - Ruta pública (sin sesión, ver la lista de
 * "Rutas públicas sin sesión" en CLAUDE.md): quien llama es la
 * infraestructura de Bold, no una persona logueada. Autenticada por firma
 * (`x-bold-signature`, HMAC-SHA256 sobre el body en Base64 con
 * `BOLD_SECRET_KEY` — ver lib/bold.ts::verifyBoldWebhookSignature), mismo
 * principio que `x-cron-secret` en los cron jobs: nunca queda abierta por
 * accidente.
 *
 * Bold reintenta hasta 5 veces si no respondemos 200 dentro de ~2s — por
 * eso el trabajo real (`recordBoldPaymentIfNew`) es idempotente por
 * `payment_id` (índice único parcial, migración 0021) y esta ruta
 * responde 200 incluso cuando el evento no era procesable (tipo distinto
 * de SALE_APPROVED, order-id que no calza con ninguna factura) — no hay
 * nada que un reintento fuera a arreglar en esos casos, así que dejar que
 * Bold siga reintentando sería ruido puro. Solo se responde algo distinto
 * de 200 cuando la firma no es válida (rechazo real de seguridad) o
 * cuando falla la escritura en base de datos (ahí sí conviene el
 * reintento, podría ser una caída puntual).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-bold-signature");

  if (!verifyBoldWebhookSignature(rawBody, signature)) {
    logError("⚠️ [Bold Webhook] Firma inválida — evento descartado", null);
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let event: BoldWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Firma válida pero body no es JSON — no debería pasar nunca viniendo
    // de Bold; se ack igual, reintentar no lo va a arreglar.
    return NextResponse.json({ received: true });
  }

  if (event.type !== "SALE_APPROVED") {
    return NextResponse.json({ received: true });
  }

  const reference = event.data?.metadata?.reference;
  const paymentId = event.data?.payment_id;
  const amount = event.data?.amount?.total;

  const invoiceId = reference ? parseInvoiceIdFromBoldOrderId(reference) : null;
  if (!invoiceId || !paymentId || amount === undefined) {
    logError("⚠️ [Bold Webhook] Evento SALE_APPROVED sin los campos esperados", null, { reference, paymentId, amount });
    return NextResponse.json({ received: true });
  }

  try {
    const paidAt = event.data?.created_at ? event.data.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);

    const result = await recordBoldPaymentIfNew({ invoiceId, amount, paidAt, providerReference: paymentId });

    if (result.inserted) {
      await logAudit(query, {
        actorId: null,
        actorEmail: "webhook:bold",
        action: "invoice.payment",
        entityType: "invoice",
        entityId: invoiceId,
        diff: { after: { provider: "bold", paymentId, amount } },
        ip: null,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError("❌ [Bold Webhook] Error al registrar el pago", error, { invoiceId, paymentId });
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
