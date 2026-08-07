import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { recordInvoicePayment } from "@/lib/queries/invoices";

const CreatePaymentSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  paid_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  method: z.string().trim().max(100).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/payments - Registra un abono (total o parcial)
 * contra una factura. Requiere invoices:write (solo admin). El saldo se
 * calcula siempre en la consulta (amount - SUM(payments)), nunca se
 * guarda como campo propio — así nunca puede desincronizarse.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "invoices:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const invoiceId = Number((await params).id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "ID de factura inválido." }, { status: 400 });
  }

  try {
    const parsed = CreatePaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de pago inválidos." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const payment = await withTransaction(async (client) => {
      const created = await recordInvoicePayment(invoiceId, parsed.data, session.id, client);
      if (!created) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "invoice.payment",
        entityType: "invoice",
        entityId: invoiceId,
        diff: { after: created },
        ip,
      });

      return created;
    });

    if (!payment) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, payment: { ...payment, amount: Number(payment.amount) } });
  } catch (error) {
    console.error("❌ [API POST Invoice Payment Error]", error);
    return NextResponse.json({ error: "Error al registrar el pago." }, { status: 500 });
  }
}

