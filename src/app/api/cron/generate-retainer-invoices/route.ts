import { NextResponse } from "next/server";
import { generateDueRetainerInvoices } from "@/lib/queries/retainers";
import { logError } from "@/lib/logger";

/**
 * POST /api/cron/generate-retainer-invoices - Genera una factura por cada
 * retainer activo cuyo `next_invoice_date` ya llegó, y avanza esa fecha
 * un mes. Pensado para un Render Cron Job diario — mismo patrón de
 * `x-cron-secret` que `check-notifications`/`seo-pulse`/`content-pulse`/
 * `weekly-digest`: sin sesión de usuario (quien llama es infraestructura),
 * y sin `CRON_SECRET` configurado la ruta se niega a correr.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor." }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-cron-secret")?.trim();
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const generated = await generateDueRetainerInvoices();
    return NextResponse.json({ success: true, invoicesGenerated: generated });
  } catch (error) {
    logError("❌ [Cron Retainer Invoices] falló", error);
    return NextResponse.json({ error: "Error al generar facturas de retainers." }, { status: 500 });
  }
}
