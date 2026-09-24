import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { createLead } from "@/lib/queries/leads";
import { computeEstimatorQuote } from "@/lib/estimatorQuote";
import { buildEstimatorQuoteEmail } from "@/lib/estimatorQuoteEmail";
import { sendEmail } from "@/lib/email";
import { resolveLeadService, ESTIMATOR_TYPE_TO_SERVICE_SLUG } from "@/lib/leadServices";
import { locales, defaultLocale } from "@/lib/i18n";
import { logError } from "@/lib/logger";

// Mismo criterio de dominios falsos que /api/contact::ContactSchema — acá
// no se reutiliza ese módulo a propósito, es un chequeo de 5 líneas y ya
// vive duplicado en dos sitios (Contact.tsx + /api/contact), sacar una
// tercera copia a un helper compartido es un refactor válido pero no
// parte de esta tarea.
const FAKE_EMAIL_DOMAINS = ["test.com", "asdf.com", "fake.com", "xxx.com", "example.com", "mailinator.com", "tempmail.com", "dispostable.com"];

const QuoteEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .refine((val) => !FAKE_EMAIL_DOMAINS.includes(val.split("@")[1]?.toLowerCase() ?? ""), "Correo no válido."),
  // Solo IDs del catálogo — nunca texto libre (título/precio/etc.), ver
  // el comentario largo en lib/estimatorQuote.ts sobre por qué.
  typeId: z.string().trim().min(1).max(50),
  addonIds: z.array(z.string().trim().max(50)).max(10).default([]),
  pace: z.enum(["standard", "express"]),
  currency: z.enum(["COP", "USD"]),
  locale: z.enum(locales).optional(),
});

/**
 * POST /api/estimator/quote-email - "Recíbelo por correo" del cotizador
 * (ver ProjectEstimator.tsx): captura suave, solo con el correo, sin
 * pedir nombre ni obligar a llenar el formulario de contacto completo —
 * antes, alguien que configuraba un proyecto de $10M y no llenaba el
 * formulario grande se iba sin dejar ningún rastro. Público, sin sesión,
 * mismo patrón de rate limit que /api/leads y /api/contact.
 *
 * La cotización se RECALCULA server-side (`computeEstimatorQuote`) a
 * partir de `typeId`/`addonIds`/`pace`/`currency` — nunca se confía en
 * texto ya formateado que mande el navegador, porque este endpoint manda
 * un correo a cualquier dirección que el visitante escriba, y aceptar
 * texto libre lo habría convertido en una vía para mandar contenido
 * arbitrario desde el dominio de la agencia.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`estimator-quote:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const parsed = QuoteEmailSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const { email, typeId, addonIds, pace, currency, locale } = parsed.data;
    const resolvedLocale = locale ?? defaultLocale;

    const quote = computeEstimatorQuote({ typeId, addonIds, pace, currency, locale: resolvedLocale });
    if (!quote) {
      return NextResponse.json({ error: "Configuración de cotización inválida." }, { status: 400 });
    }

    let dbSaved = false;
    try {
      const serviceSlug = ESTIMATOR_TYPE_TO_SERVICE_SLUG[typeId];
      const service = serviceSlug ? resolveLeadService(serviceSlug) : null;

      await createLead({
        // Sin nombre real todavía (es justo el punto de la captura suave)
        // — se deriva uno legible del correo en vez de guardar un string
        // vacío o un literal genérico, mismo criterio de "nunca inventar
        // un dato que parezca haberlo dado la persona" salvo que acá es
        // honestamente derivado de lo único que sí dio: su correo.
        name: email.split("@")[0],
        email,
        service,
        budget: quote.formattedTotal,
        currency,
        estimatedWeeks: quote.totalWeeks,
        message: `Cotización generada desde la calculadora (sin conversación aún): ${quote.typeTitle}. Módulos: ${
          quote.addonTitles.join(", ") || "Ninguno"
        }. Ritmo: ${quote.paceLabel}.`,
        source: "Cotizador (solo email)",
      });
      dbSaved = true;
    } catch (dbErr) {
      logError("⚠️ [Estimator Quote Email] No se pudo guardar el lead", dbErr);
    }

    let emailSent = false;
    try {
      const built = buildEstimatorQuoteEmail({ quote, locale: resolvedLocale });
      await sendEmail({ to: email, ...built });
      emailSent = true;
    } catch (emailErr) {
      logError("⚠️ [Estimator Quote Email] No se pudo enviar el correo", emailErr);
    }

    if (!dbSaved && !emailSent) {
      return NextResponse.json({ error: "No pudimos procesar tu solicitud. Intenta de nuevo." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Estimator Quote Email Error]", error);
    return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
  }
}
