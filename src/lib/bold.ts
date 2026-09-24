import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { logError } from "./logger";
import type { BoldCheckoutConfig } from "./boldShared";

export { parseInvoiceIdFromBoldOrderId } from "./boldShared";
export type { BoldCheckoutConfig } from "./boldShared";

/**
 * Integración con Bold (bold.co) — pagos en línea desde /portal.
 * Referencia oficial: https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
 * (checkout personalizado vía `new BoldCheckout({...}).open()`) y
 * https://developers.bold.co/webhook (eventos SALE_APPROVED firmados).
 *
 * Dos llaves, dos usos, no las confundas:
 * - `NEXT_PUBLIC_BOLD_IDENTITY_KEY` ("llave de identidad"): pública a
 *   propósito según la propia documentación de Bold ("Bold identifica tu
 *   comercio gracias a esta llave única, también llamada API key") — viaja
 *   al navegador (`data-api-key`/`apiKey` del checkout) y se reutiliza acá
 *   como header `Authorization: x-api-key <identidad>` para consultar el
 *   estado de una transacción.
 * - `BOLD_SECRET_KEY` ("llave secreta"): nunca sale del servidor. Se usa
 *   para (a) el hash de integridad que Bold verifica antes de cobrar, y
 *   (b) la firma HMAC de los eventos de webhook. En el ambiente de pruebas
 *   de Bold esta llave documentadamente es un string vacío — el código de
 *   abajo no distingue "no configurada" de "vacía a propósito para
 *   sandbox", exactamente como indican sus propios docs.
 */

const BOLD_ORDER_ID_PREFIX = "inv";
// 8 hex chars de aleatoriedad — suficiente para que dos intentos de pago
// de la misma factura (ej. el primero declinado, el cliente reintenta)
// nunca generen el mismo order-id, que Bold exige único por venta.
const ORDER_ID_SUFFIX_BYTES = 4;

export function buildBoldOrderId(invoiceId: number): string {
  const suffix = randomBytes(ORDER_ID_SUFFIX_BYTES).toString("hex");
  return `${BOLD_ORDER_ID_PREFIX}-${invoiceId}-${suffix}`;
}

/**
 * Hash de integridad que Bold exige junto al botón/checkout — sin él
 * (o si no calza), Bold rechaza el intento de cobro antes de mostrar el
 * formulario de pago. Fórmula exacta de la documentación:
 * sha256(`${orderId}${amount}${currency}${secretKey}`), monto sin
 * separadores de miles ni decimales (mismo string que se manda como
 * `amount`).
 */
export function computeBoldIntegritySignature({
  orderId,
  amount,
  currency,
}: {
  orderId: string;
  amount: number;
  currency: string;
}): string {
  const secretKey = process.env.BOLD_SECRET_KEY ?? "";
  const raw = `${orderId}${amount}${currency}${secretKey}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Verifica `x-bold-signature` de un evento de webhook. Algoritmo exacto
 * documentado por Bold (no es el patrón usual de HMAC-sobre-el-body-crudo):
 * primero se codifica el body completo en Base64, y RECIÉN sobre ese texto
 * codificado se calcula el HMAC-SHA256 con la llave secreta, en hex.
 * `rawBody` debe ser el string exacto recibido (antes de `JSON.parse`) —
 * cualquier re-serialización cambiaría el resultado.
 */
export function verifyBoldWebhookSignature(rawBody: string, signatureHeader: string | null | undefined): boolean {
  if (!signatureHeader) return false;

  const secretKey = process.env.BOLD_SECRET_KEY ?? "";
  const encodedBody = Buffer.from(rawBody, "utf8").toString("base64");
  const expected = createHmac("sha256", secretKey).update(encodedBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  // Longitudes distintas harían que `timingSafeEqual` lance en vez de
  // devolver `false` — se descarta antes, sin comparar (un largo distinto
  // ya es suficiente para saber que no calza, no hace falta timing-safe ahí).
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}

/** `null` si `NEXT_PUBLIC_BOLD_IDENTITY_KEY` no está configurada — a
 * diferencia de `BOLD_SECRET_KEY`, esta llave nunca es legítimamente un
 * string vacío (ni siquiera en pruebas, Bold la exige siempre real), así
 * que su ausencia sí significa "Bold no está configurado todavía". */
export function isBoldConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY?.trim());
}

export function buildBoldCheckoutConfig({
  invoiceId,
  amount,
  currency,
  description,
  redirectionUrl,
}: {
  invoiceId: number;
  amount: number;
  currency: string;
  description: string;
  redirectionUrl: string;
}): BoldCheckoutConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY?.trim();
  if (!apiKey) return null;

  const orderId = buildBoldOrderId(invoiceId);
  const integritySignature = computeBoldIntegritySignature({ orderId, amount, currency });

  return { orderId, amount, currency, apiKey, integritySignature, description, redirectionUrl };
}

export type BoldPaymentStatus = "APPROVED" | "NO_TRANSACTION_FOUND" | "REJECTED" | "PENDING" | string;

export interface BoldPaymentVoucher {
  payment_status: BoldPaymentStatus;
  transaction_id?: string;
  total?: number;
  reference_id?: string;
}

/**
 * `GET /v2/payment-voucher/{orderId}` — consulta directa a Bold del
 * estado real de una venta (nunca confiar solo en el `bold-tx-status` de
 * la URL de retorno, la propia documentación de Bold lo advierte: "el
 * estado de la transacción recibido...puede no ser el definitivo"). Se usa
 * como respaldo del webhook, no como reemplazo — ver
 * app/api/invoices/[id]/bold-status/route.ts.
 */
export async function fetchBoldPaymentVoucher(orderId: string): Promise<BoldPaymentVoucher | null> {
  const apiKey = process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: { Authorization: `x-api-key ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      logError("⚠️ [Bold] Respuesta no-OK al consultar el voucher de pago", null, { orderId, status: res.status });
      return null;
    }

    return (await res.json()) as BoldPaymentVoucher;
  } catch (error) {
    logError("⚠️ [Bold] Error de red al consultar el voucher de pago", error, { orderId });
    return null;
  }
}
