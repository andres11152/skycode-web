import { z } from "zod";

/**
 * Campos de atribución de campaña que capturan tanto `/api/contact` como
 * `/api/leads` (POST) — mismos nombres que columnas en `leads` (ver
 * migración 0005) y que `lib/attribution.ts` en el cliente. Todos
 * opcionales: un visitante que llega directo, sin UTMs ni referrer, sigue
 * siendo un lead válido.
 */
export const AttributionFieldsSchema = z.object({
  utm_source: z.string().trim().max(255).optional(),
  utm_medium: z.string().trim().max(255).optional(),
  utm_campaign: z.string().trim().max(255).optional(),
  utm_term: z.string().trim().max(255).optional(),
  utm_content: z.string().trim().max(255).optional(),
  gclid: z.string().trim().max(255).optional(),
  fbclid: z.string().trim().max(255).optional(),
  referrer: z.string().trim().max(2000).optional(),
  landing_page: z.string().trim().max(500).optional(),
});

export type AttributionFields = z.infer<typeof AttributionFieldsSchema>;
