import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { getInvoiceForCheckout, isInvoiceOwnedByClient } from "@/lib/queries/boldPayments";
import { buildBoldCheckoutConfig, isBoldConfigured } from "@/lib/bold";
import { siteUrl } from "@/lib/site";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/bold-checkout - Arma la configuración firmada
 * para que el cliente abra el checkout de Bold desde /portal
 * (`BoldPayButton.tsx`) y pague su propia factura con tarjeta. Exclusivo
 * de `role === "client"` sobre una factura propia (mismo criterio de
 * dueño que el resto del portal, sin permiso RBAC — `client` no tiene
 * permisos declarados en rbac.ts) — el equipo interno sigue registrando
 * pagos manuales desde /dashboard/facturacion, sin cambios ahí.
 *
 * No muta nada: solo genera un `order-id` nuevo y su hash de integridad
 * (ver lib/bold.ts). El pago en sí se confirma después, por dos caminos
 * independientes — el webhook (POST /api/webhooks/bold) y la confirmación
 * al volver del checkout (GET /api/invoices/[id]/bold-status) — nunca acá.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (session.role !== "client" || !session.clientId) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  if (!isBoldConfigured()) {
    return NextResponse.json({ error: "Los pagos en línea no están disponibles todavía." }, { status: 503 });
  }

  const invoiceId = Number((await params).id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "ID de factura inválido." }, { status: 400 });
  }

  try {
    const owned = await isInvoiceOwnedByClient(invoiceId, session.clientId);
    if (!owned) {
      // Mismo 404 (no 403) que el resto del portal cuando el recurso no es
      // del cliente que llama — no hay que confirmarle que el ID existe.
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const invoice = await getInvoiceForCheckout(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Esta factura ya no tiene saldo pendiente." }, { status: 409 });
    }

    // Bold trabaja en montos enteros (sin decimales, ver lib/bold.ts) — el
    // saldo ya viene en unidades completas de la moneda de la factura
    // (COP/USD), redondeado por si `payments.amount` trajera centavos de
    // un abono manual parcial.
    const amount = Math.round(invoice.balance);

    const config = buildBoldCheckoutConfig({
      invoiceId: invoice.id,
      amount,
      currency: invoice.currency,
      description: invoice.description.slice(0, 100),
      redirectionUrl: `${siteUrl}/portal`,
    });

    if (!config) {
      return NextResponse.json({ error: "Los pagos en línea no están disponibles todavía." }, { status: 503 });
    }

    return NextResponse.json({ success: true, checkout: config });
  } catch (error) {
    logError("❌ [API POST Bold Checkout Error]", error);
    return NextResponse.json({ error: "Error al preparar el pago." }, { status: 500 });
  }
}
