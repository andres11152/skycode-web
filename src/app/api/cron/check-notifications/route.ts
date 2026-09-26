import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { notifyViewedProposals, notifyOverdueInvoices, notifySlaWarnings, notifyLeadFollowUps } from "@/lib/queries/notifications";
import { logError } from "@/lib/logger";

/**
 * POST /api/cron/check-notifications - Dispara los cuatro avisos por
 * correo (propuesta vista, factura vencida, SLA por vencer, seguimiento
 * de lead pendiente). Pensado para un
 * Render Cron Job (ej. cada hora) que le pega con un secreto compartido —
 * NO usa sesión de usuario, porque quien llama es infraestructura, no una
 * persona logueada. `CRON_SECRET` (ver .env.example) debe coincidir
 * exactamente con el header `x-cron-secret`; sin la variable configurada,
 * esta ruta se niega a correr (nunca corre "abierta" por accidente).
 *
 * Cada `notify*()` es independiente y de mejor esfuerzo — si una falla
 * (ej. un error de red al enviar un correo puntual), no bloquea a las
 * demás ni hace fallar la respuesta completa.
 */
export async function POST(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const results = { proposalsViewed: 0, invoicesOverdue: 0, slaWarnings: 0, leadFollowUps: 0 };

  try {
    results.proposalsViewed = await notifyViewedProposals();
  } catch (error) {
    logError("❌ [Cron Notifications] notifyViewedProposals falló", error);
  }

  try {
    results.invoicesOverdue = await notifyOverdueInvoices();
  } catch (error) {
    logError("❌ [Cron Notifications] notifyOverdueInvoices falló", error);
  }

  try {
    results.slaWarnings = await notifySlaWarnings();
  } catch (error) {
    logError("❌ [Cron Notifications] notifySlaWarnings falló", error);
  }

  try {
    results.leadFollowUps = await notifyLeadFollowUps();
  } catch (error) {
    logError("❌ [Cron Notifications] notifyLeadFollowUps falló", error);
  }

  return NextResponse.json({ success: true, ...results });
}
