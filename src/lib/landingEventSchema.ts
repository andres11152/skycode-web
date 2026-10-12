import { z } from "zod";

/**
 * Cuerpo de `POST /api/landing-events`. Puro (sin `pg`) para que lo use la
 * ruta y su prueba. Sin datos personales a propósito: tipo de evento, la
 * ruta de la landing y, si hubo consentimiento de medición, la atribución.
 *
 * `landing_page` solo admite una ruta propia (`/landing…`): es el único dato
 * de texto libre que se guarda y no debe poder llenarse con basura.
 */
export const LANDING_EVENT_KINDS = ["whatsapp_click"] as const;

export const LandingEventSchema = z
  .object({
    kind: z.enum(LANDING_EVENT_KINDS),
    landing_page: z
      .string()
      .trim()
      .max(200)
      .regex(/^\/landing(\/[a-z0-9-]+)*$/),
    utm_source: z.string().trim().max(255).optional(),
    utm_medium: z.string().trim().max(255).optional(),
    utm_campaign: z.string().trim().max(255).optional(),
    utm_term: z.string().trim().max(255).optional(),
    utm_content: z.string().trim().max(255).optional(),
    gclid: z.string().trim().max(255).optional(),
  })
  .strict();

export type LandingEventInput = z.infer<typeof LandingEventSchema>;
