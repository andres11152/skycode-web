/**
 * Construcción del enlace/texto de WhatsApp para contactar a un lead desde
 * el dashboard — antes duplicado (con textos ligeramente distintos) en la
 * fila de la tabla y en el panel de detalle de LeadsTable.tsx.
 *
 * El texto ya no asume "cotización" para cualquier lead: ese lenguaje solo
 * tiene sentido para un lead que sí pasó por el cotizador o dejó un
 * presupuesto/servicio real. Para un lead sin `service` (mensaje genérico
 * de contacto, sin selección) se usa un saludo neutral en vez de inventar
 * un servicio ("Contacto Web") o fingir que cotizó algo.
 */

export interface LeadWhatsappInput {
  name: string;
  phone?: string | null;
  service?: string | null;
}

/** Igual que `lead.phone.replace(...)` repetido en LeadsTable.tsx — centralizado. */
export function sanitizeLeadPhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9+]/g, "");
}

export function buildLeadWhatsappMessage({ name, service }: Pick<LeadWhatsappInput, "name" | "service">): string {
  const trimmedService = service?.trim();

  if (trimmedService) {
    return `Hola ${name}, te escribimos de SKYCODE Agency respecto a tu solicitud de ${trimmedService}.`;
  }

  return `Hola ${name}, te escribimos de SKYCODE Agency respecto al mensaje que nos enviaste desde nuestro sitio web.`;
}

/** `null` cuando el lead no tiene teléfono utilizable — mismo criterio que ya usa LeadsTable. */
export function buildLeadWhatsappUrl(lead: LeadWhatsappInput): string | null {
  const cleanPhone = sanitizeLeadPhone(lead.phone);
  if (!cleanPhone) return null;

  const text = buildLeadWhatsappMessage(lead);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
