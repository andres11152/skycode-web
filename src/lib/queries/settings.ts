import { query } from "../db";

export interface Settings {
  defaultTaxRatePct: number;
  invoiceNumberPrefix: string;
  invoiceNextNumber: number;
  slaHoursUrgente: number;
  slaHoursAlta: number;
  slaHoursMedia: number;
  slaHoursBaja: number;
  manualUsdToCopRate: number | null;
  updatedAt: string;
}

function shapeSettingsRow(row: Record<string, unknown>): Settings {
  return {
    defaultTaxRatePct: Number(row.default_tax_rate_pct),
    invoiceNumberPrefix: String(row.invoice_number_prefix ?? ""),
    invoiceNextNumber: Number(row.invoice_next_number),
    slaHoursUrgente: Number(row.sla_hours_urgente),
    slaHoursAlta: Number(row.sla_hours_alta),
    slaHoursMedia: Number(row.sla_hours_media),
    slaHoursBaja: Number(row.sla_hours_baja),
    manualUsdToCopRate: row.manual_usd_to_cop_rate !== null ? Number(row.manual_usd_to_cop_rate) : null,
    updatedAt: String(row.updated_at ?? ""),
  };
}

/**
 * Fila única de configuración global (id=1, sembrada por la migración
 * 0015) — siempre existe, así que esto nunca debería devolver `null` en
 * un sistema migrado correctamente.
 */
export async function getSettings(): Promise<Settings> {
  const res = await query(`SELECT * FROM settings WHERE id = 1;`);
  if (res.rows.length === 0) {
    throw new Error("La fila de configuración (id=1) no existe — ¿faltó aplicar la migración 0015?");
  }
  return shapeSettingsRow(res.rows[0]);
}

interface QueryRunner {
  query: typeof query;
}

export interface UpdateSettingsData {
  default_tax_rate_pct?: number;
  invoice_number_prefix?: string;
  sla_hours_urgente?: number;
  sla_hours_alta?: number;
  sla_hours_media?: number;
  sla_hours_baja?: number;
  manual_usd_to_cop_rate?: number | null;
}

/**
 * `invoice_next_number` NO se edita acá a propósito — se avanza solo,
 * atómicamente, cada vez que se emite una factura (ver
 * `consumeNextInvoiceNumber`). Editarlo a mano por este endpoint abriría
 * la puerta a números de factura duplicados si alguien lo retrocede.
 */
export async function updateSettings(
  data: UpdateSettingsData,
  userId: number | string,
  dbRunner: QueryRunner = { query }
): Promise<Settings> {
  const res = await dbRunner.query(
    `UPDATE settings SET
       default_tax_rate_pct = COALESCE($1, default_tax_rate_pct),
       invoice_number_prefix = COALESCE($2, invoice_number_prefix),
       sla_hours_urgente = COALESCE($3, sla_hours_urgente),
       sla_hours_alta = COALESCE($4, sla_hours_alta),
       sla_hours_media = COALESCE($5, sla_hours_media),
       sla_hours_baja = COALESCE($6, sla_hours_baja),
       manual_usd_to_cop_rate = CASE WHEN $7::boolean THEN $8::numeric ELSE manual_usd_to_cop_rate END,
       updated_at = now(),
       updated_by = $9
     WHERE id = 1
     RETURNING *;`,
    [
      data.default_tax_rate_pct ?? null,
      data.invoice_number_prefix ?? null,
      data.sla_hours_urgente ?? null,
      data.sla_hours_alta ?? null,
      data.sla_hours_media ?? null,
      data.sla_hours_baja ?? null,
      "manual_usd_to_cop_rate" in data,
      data.manual_usd_to_cop_rate ?? null,
      userId,
    ]
  );
  return shapeSettingsRow(res.rows[0]);
}

/**
 * Avanza `invoice_next_number` atómicamente y devuelve el número ya
 * formateado (ej. "FAC-0001") para la factura que se está creando. El
 * `UPDATE ... RETURNING` toma el lock de fila de `settings`, así que dos
 * facturas creadas al mismo tiempo nunca reciben el mismo número — no
 * hace falta una transacción `SERIALIZABLE` para esto.
 */
export async function consumeNextInvoiceNumber(dbRunner: QueryRunner): Promise<string> {
  const res = await dbRunner.query(
    `UPDATE settings SET invoice_next_number = invoice_next_number + 1
     WHERE id = 1
     RETURNING invoice_number_prefix, invoice_next_number - 1 AS number_used;`
  );
  const row = res.rows[0];
  const prefix = String(row.invoice_number_prefix ?? "");
  const numberUsed = Number(row.number_used);
  return `${prefix}${String(numberUsed).padStart(4, "0")}`;
}
