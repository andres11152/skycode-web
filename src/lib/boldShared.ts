/**
 * Parte de la integración con Bold que es segura de importar desde un
 * "use client" (PortalView.tsx la usa para leer el `?bold-order-id=...`
 * que Bold agrega al volver del checkout) — sin `node:crypto` ni ningún
 * otro import server-only. `lib/bold.ts` (el resto de la integración:
 * firma, hash de integridad, llamadas a la API de Bold) reexporta esto
 * mismo para los callers de servidor, mismo criterio de separación que
 * `content/blogShared.ts` vs `content/blog.ts` — ver CLAUDE.md.
 */

const ORDER_ID_PATTERN = /^inv-(\d+)-[a-f0-9]{8}$/;

export function parseInvoiceIdFromBoldOrderId(orderId: string): number | null {
  const match = ORDER_ID_PATTERN.exec(orderId);
  if (!match) return null;
  const invoiceId = Number(match[1]);
  return Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null;
}

export interface BoldCheckoutConfig {
  orderId: string;
  amount: number;
  currency: string;
  apiKey: string;
  integritySignature: string;
  description: string;
  redirectionUrl: string;
}
