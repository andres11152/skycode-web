import { query } from "../db";
import { getUsdToCopRate } from "../exchangeRate";
import { convertCurrency, type Currency } from "../currency";

export interface CashProjectionBucket {
  key: "overdue" | "current" | "next1" | "next2" | "later";
  label: string;
  totalCop: number;
}

export interface ProposalProbabilityBucket {
  status: "sent" | "viewed";
  label: string;
  probabilityPct: number;
  count: number;
  totalCop: number;
  weightedCop: number;
}

export interface CashProjection {
  invoiceBuckets: CashProjectionBucket[];
  proposalBuckets: ProposalProbabilityBucket[];
  totalConfirmedCop: number;
  totalWeightedProbableCop: number;
  totalProjectedCop: number;
  usdToCopRate: number;
}

// Probabilidad de cierre por estado de propuesta — heurística fija, no
// calculada de datos históricos (esta agencia no tiene volumen todavía
// para que una tasa de conversión real por estado sea confiable). "Vista"
// pesa más que "Enviada" porque el cliente ya interactuó con el enlace —
// señal real de interés, no solo que el correo llegó.
const PROBABILITY_BY_STATUS: Record<"sent" | "viewed", number> = { sent: 30, viewed: 50 };

/**
 * Proyección de caja: ingresos **confirmados** (saldo pendiente de
 * facturas ya emitidas, sin pagar, agrupado por mes de vencimiento) más
 * ingresos **probables** (propuestas en negociación — ni aceptadas ni
 * rechazadas ni vencidas — ponderadas por una probabilidad de cierre según
 * su estado). Todo convertido a COP con la tasa vigente, mismo criterio
 * que `lib/queries/profitability.ts`: sumar montos en COP y USD sin
 * convertir daría un número sin sentido.
 *
 * Las propuestas NO se agrupan por mes (a diferencia de las facturas):
 * `valid_until` es su fecha de VENCIMIENTO del enlace, no una fecha
 * esperada de cierre — no hay ninguna columna que diga cuándo se espera
 * que un prospecto decida, así que agruparlas por mes sería inventar
 * precisión que los datos no tienen. Se reportan como un solo total
 * ponderado, desglosado por estado.
 */
export async function getCashProjection(prefetchedRate?: number): Promise<CashProjection> {
  const usdToCopRate = prefetchedRate ?? (await getUsdToCopRate());

  const invoiceRes = await query(`
    WITH balances AS (
      SELECT i.due_date, i.currency, (i.amount - COALESCE(SUM(p.amount), 0)) AS balance
      FROM invoices i
      LEFT JOIN payments p ON p.invoice_id = i.id
      WHERE i.deleted_at IS NULL
      GROUP BY i.id
    )
    SELECT
      CASE
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        WHEN date_trunc('month', due_date) = date_trunc('month', CURRENT_DATE) THEN 'current'
        WHEN date_trunc('month', due_date) = date_trunc('month', CURRENT_DATE) + interval '1 month' THEN 'next1'
        WHEN date_trunc('month', due_date) = date_trunc('month', CURRENT_DATE) + interval '2 month' THEN 'next2'
        ELSE 'later'
      END AS bucket,
      currency,
      SUM(balance) AS balance_sum
    FROM balances
    WHERE balance > 0
    GROUP BY bucket, currency;
  `);

  const BUCKET_LABELS: Record<CashProjectionBucket["key"], string> = {
    overdue: "Vencidas (sin cobrar)",
    current: "Este mes",
    next1: "Próximo mes",
    next2: "En 2 meses",
    later: "Más adelante",
  };
  const bucketTotals: Record<CashProjectionBucket["key"], number> = {
    overdue: 0,
    current: 0,
    next1: 0,
    next2: 0,
    later: 0,
  };
  for (const row of invoiceRes.rows) {
    const key = row.bucket as CashProjectionBucket["key"];
    const cop = convertCurrency(Number(row.balance_sum), row.currency as Currency, "COP", usdToCopRate);
    bucketTotals[key] += cop;
  }
  const invoiceBuckets: CashProjectionBucket[] = (["overdue", "current", "next1", "next2", "later"] as const).map(
    (key) => ({ key, label: BUCKET_LABELS[key], totalCop: bucketTotals[key] })
  );
  const totalConfirmedCop = invoiceBuckets.reduce((sum, b) => sum + b.totalCop, 0);

  const proposalRes = await query(`
    SELECT p.id, p.currency, p.tax_rate, (p.viewed_at IS NOT NULL) AS is_viewed,
           COALESCE(SUM(pi.quantity * pi.unit_price), 0) AS subtotal
    FROM proposals p
    LEFT JOIN proposal_items pi ON pi.proposal_id = p.id
    WHERE p.accepted_at IS NULL AND p.rejected_at IS NULL
      AND (p.valid_until IS NULL OR p.valid_until >= CURRENT_DATE)
    GROUP BY p.id;
  `);

  const proposalTotals: Record<"sent" | "viewed", { count: number; totalCop: number }> = {
    sent: { count: 0, totalCop: 0 },
    viewed: { count: 0, totalCop: 0 },
  };
  for (const row of proposalRes.rows) {
    const status: "sent" | "viewed" = row.is_viewed ? "viewed" : "sent";
    const total = Number(row.subtotal) * (1 + Number(row.tax_rate) / 100);
    const cop = convertCurrency(total, row.currency as Currency, "COP", usdToCopRate);
    proposalTotals[status].count += 1;
    proposalTotals[status].totalCop += cop;
  }
  const PROPOSAL_LABELS: Record<"sent" | "viewed", string> = { sent: "Enviadas (sin ver)", viewed: "Vistas por el cliente" };
  const proposalBuckets: ProposalProbabilityBucket[] = (["sent", "viewed"] as const).map((status) => {
    const { count, totalCop } = proposalTotals[status];
    const probabilityPct = PROBABILITY_BY_STATUS[status];
    return { status, label: PROPOSAL_LABELS[status], probabilityPct, count, totalCop, weightedCop: totalCop * (probabilityPct / 100) };
  });
  const totalWeightedProbableCop = proposalBuckets.reduce((sum, b) => sum + b.weightedCop, 0);

  return {
    invoiceBuckets,
    proposalBuckets,
    totalConfirmedCop,
    totalWeightedProbableCop,
    totalProjectedCop: totalConfirmedCop + totalWeightedProbableCop,
    usdToCopRate,
  };
}
