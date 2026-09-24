import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession, withAuth } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getAllInvoices, getClientInvoices, createInvoice } from "@/lib/queries/invoices";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const CreateInvoiceSchema = z.object({
  project_id: z.number().int().positive(),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive().max(1_000_000_000),
  currency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
});

/**
 * GET /api/invoices - Admin/sales_manager (invoices:read) ven todas las
 * facturas con saldo, estado (pending/overdue/paid) y antigüedad
 * calculados. Un cliente ve solo las suyas (por `users.client_id` →
 * `projects.client_id`, mismo criterio de dueño que `/api/projects`) —
 * de solo lectura para CREAR facturas (eso sigue siendo exclusivo de
 * /dashboard/facturacion). Para pagarlas en línea con Bold, ver
 * /api/invoices/[id]/bold-checkout y bold-status, más el webhook público
 * en /api/webhooks/bold — ninguno de los tres pasa por esta ruta.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    let invoices;
    if (session.role === "client") {
      invoices = session.clientId ? await getClientInvoices(session.clientId) : [];
    } else if (hasPermission(session.role, "invoices:read")) {
      invoices = await getAllInvoices();
    } else {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    logError("❌ [API GET Invoices Error]", error);
    return NextResponse.json({ error: "Error al obtener facturas." }, { status: 500 });
  }
}

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
    logError("❌ [API POST Invoice Error]", error);
    return NextResponse.json({ error: "Error al crear la factura." }, { status: 500 });
  }
});

