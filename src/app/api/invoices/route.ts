import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getAllInvoices, createInvoice } from "@/lib/queries/invoices";
import { CURRENCIES } from "@/lib/currency";

const CreateInvoiceSchema = z.object({
  project_id: z.number().int().positive(),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive().max(1_000_000_000),
  currency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
});

/**
 * GET /api/invoices - Tablero de cobranza: facturas con saldo, estado
 * (pending/overdue/paid) y antigüedad calculados. Requiere invoices:read
 * (admin, sales_manager).
 */
export const GET = withAuth("invoices:read", async () => {
  try {
    const invoices = await getAllInvoices();
    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("❌ [API GET Invoices Error]", error);
    return NextResponse.json({ error: "Error al obtener facturas." }, { status: 500 });
  }
});

/**
 * POST /api/invoices - Emite una factura para un proyecto. Requiere
 * invoices:write (solo admin).
 */
export const POST = withAuth("invoices:write", async (request, { session }) => {
  try {
    const parsed = CreateInvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de factura inválidos." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const invoice = await withTransaction(async (client) => {
      const created = await createInvoice(parsed.data, session.id, client);
      if (!created) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "invoice.create",
        entityType: "invoice",
        entityId: created.id,
        diff: { after: created },
        ip,
      });

      return created;
    });

    if (!invoice) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("❌ [API POST Invoice Error]", error);
    return NextResponse.json({ error: "Error al crear la factura." }, { status: 500 });
  }
});

