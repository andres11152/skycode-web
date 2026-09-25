import { formatMoney } from "./utils";
import { sanitizeLeadPhone } from "./leadWhatsapp";
import type { Currency } from "./currency";

/**
 * Recordatorio de factura vencida por WhatsApp — mismo patrón que
 * `leadWhatsapp.ts` (enlace `wa.me` con texto prellenado, sin API de
 * WhatsApp Business ni envío automático: quien lo dispara es una persona
 * del equipo haciendo clic, no un cron). Reutiliza `sanitizeLeadPhone()`
 * en vez de duplicar la limpieza del número — el formato es el mismo
 * (solo dígitos y `+`) sin importar si el teléfono es de un lead o de un
 * cliente ya convertido.
 */
export interface InvoiceWhatsappInput {
  client_name: string;
  client_phone: string | null;
  invoice_number: string | null;
  balance: number;
  currency: Currency;
  daysOverdue: number;
}

export function buildInvoiceWhatsappMessage({
  client_name,
  invoice_number,
  balance,
  currency,
  daysOverdue,
}: Omit<InvoiceWhatsappInput, "client_phone">): string {
  const label = invoice_number ? `la factura ${invoice_number}` : "tu factura pendiente";
  return `Hola ${client_name}, te escribimos de SkyCode Agency para recordarte que ${label} por ${formatMoney(
    balance,
    currency
  )} está vencida hace ${daysOverdue} ${daysOverdue === 1 ? "día" : "días"}. ¿Podemos ayudarte a coordinar el pago?`;
}

/** `null` cuando el cliente no tiene teléfono utilizable — mismo criterio que `buildLeadWhatsappUrl`. */
export function buildInvoiceWhatsappUrl(invoice: InvoiceWhatsappInput): string | null {
  const cleanPhone = sanitizeLeadPhone(invoice.client_phone);
  if (!cleanPhone) return null;

  const text = buildInvoiceWhatsappMessage(invoice);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
