import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { contactEmail } from "@/lib/site";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { AttributionFieldsSchema } from "@/lib/attributionSchema";
import { createLead } from "@/lib/queries/leads";
import { logError } from "@/lib/logger";
import { LEAD_FORM_CONTEXTS, LEAD_SERVICE_SLUGS, resolveLeadService } from "@/lib/leadServices";
import { sendEmail } from "@/lib/email";
import { buildLeadConfirmationEmail } from "@/lib/leadConfirmationEmail";
import { defaultLocale, locales } from "@/lib/i18n";

const ContactSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(200),
    email: z
      .string()
      .trim()
      .email("Formato de correo electrónico no válido.")
      .max(254)
      .refine((val) => {
        const fakeDomains = ["test.com", "asdf.com", "fake.com", "xxx.com", "example.com", "mailinator.com", "tempmail.com", "dispostable.com"];
        const domain = val.split("@")[1]?.toLowerCase();
        return domain && !fakeDomains.includes(domain) && domain.includes(".");
      }, "Por favor ingrese un correo electrónico corporativo o personal válido."),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{6,17}$/)
      .optional()
      .nullable()
      .or(z.literal("")),
    message: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres.").max(5000),
    // Servicio elegido en el formulario (ver lib/leadServices.ts) — enum
    // cerrado, no un string libre: un POST público no debe poder llenar
    // `leads.service` con basura arbitraria. `serviceOther` solo se usa
    // cuando `serviceSlug === "otro"`, saneado a 120 caracteres.
    serviceSlug: z.enum(LEAD_SERVICE_SLUGS).optional(),
    serviceOther: z.string().trim().max(120).optional(),
    // De dónde vino el envío — reemplaza el literal fijo "Formulario Directo"
    // que antes se asignaba sin importar el origen real (ver lib/leadServices.ts).
    formContext: z.enum(LEAD_FORM_CONTEXTS).optional(),
    // Idioma en el que la persona llenó el formulario — determina el idioma
    // del correo de confirmación (ver lib/leadConfirmationEmail.ts). El
    // <Contact/> del sitio siempre lo manda porque ya conoce su propio
    // locale por prop; queda opcional solo para no romper un POST externo
    // que no lo incluya.
    locale: z.enum(locales).optional(),
    // Autorización de tratamiento de datos (Ley 1581 de 2012 / Decreto 1377
    // de 2013) — no basta con que Contact.tsx bloquee el botón en el
    // navegador hasta marcar la casilla: eso es solo UX, no prueba nada.
    // El backend exige literalmente `true`, igual que `RespondSchema` de
    // /api/proposals/[id]/respond exige `consent: z.literal(true)` para
    // aceptar una propuesta — mismo patrón, misma razón. Sin esto, un POST
    // directo (sin pasar por el checkbox del navegador) podía crear un
    // lead sin que existiera ninguna autorización real (bug real de
    // cumplimiento, corregido junto con la migración 0035).
    consent: z.literal(true),
  })
  .extend(AttributionFieldsSchema.shape);

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");

  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`contact:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("⚠️ [Contacto Validation Failed]", parsed.error.issues);
      return NextResponse.json(
        { error: "Por favor verifique que el nombre, correo electrónico y mensaje sean válidos." },
        { status: 400 }
      );
    }

    const { name, email, phone, message, serviceSlug, serviceOther, formContext, locale } = parsed.data;
    const service = resolveLeadService(serviceSlug, serviceOther);
    const emailLocale = locale ?? defaultLocale;
    let dbSaved = false;

    // 1. Guardar automáticamente en la Base de Datos PostgreSQL (Render)
    try {
      await createLead({
        ...parsed.data,
        service,
        source: formContext || "Formulario Web",
        // El schema ya exigió `consent === true` para llegar hasta acá
        // (ver ContactSchema arriba) — se guarda el momento exacto, no
        // solo el booleano, como prueba de cumplimiento (Ley 1581).
        consentGivenAt: new Date(),
      });
      dbSaved = true;
      console.log("🐘 [PostgreSQL] Lead guardado exitosamente en BD invencheck!");
    } catch (dbErr) {
      logError("⚠️ [PostgreSQL Lead Warning]", dbErr);
    }

    // 1.5. Correo de confirmación al propio visitante (no al equipo interno,
    // eso es la sección 2 más abajo) — llamándolo por su nombre, con el
    // mismo copy de /gracias en HTML "enterprise" con logo (ver
    // lib/leadConfirmationEmail.ts). Best-effort: nunca bloquea ni hace
    // fallar la respuesta — sendEmail() ya no-opea sola si no hay
    // RESEND_API_KEY configurada, así que es seguro llamarla siempre aquí.
    try {
      const confirmation = buildLeadConfirmationEmail({ name, message, service, locale: emailLocale });
      await sendEmail({ to: email, ...confirmation });
    } catch (confirmationErr) {
      logError("⚠️ [Contacto] No se pudo enviar el correo de confirmación al visitante", confirmationErr);
    }

    // Si no hay API Key de Resend válida configurada pero se guardó en BD, retornar éxito
    if (isDummyKey) {
      console.warn("⚠️ [Contacto] RESEND_API_KEY no está configurada o es una clave de prueba.");
      // Nombre, correo, teléfono y mensaje son datos personales del titular
      // (Ley 1581/RGPD, ver TrustStrip) — no deben replicarse en la retención
      // de logs de un tercero (el host) en producción. Mismo criterio que
      // /api/leads: solo el id fuera de desarrollo.
      if (process.env.NODE_ENV !== "production") {
        console.log("📥 Mensaje recibido y guardado:", { name, email, phone, message });
      } else {
        console.log("📥 Mensaje recibido y guardado.");
      }

      return NextResponse.json({
        success: true,
        devMode: isDummyKey,
        dbSaved,
        notice: "Mensaje registrado exitosamente en el sistema de gestión.",
      });
    }

    // 2. Intentar envío de correo por Resend
    try {
      const resend = new Resend(apiKey);
      const rawTarget = process.env.CONTACT_RECEIVER_EMAIL || contactEmail || "contact@skycode.agency";
      const targetEmail = rawTarget.includes(",") ? rawTarget.split(",").map((e) => e.trim()) : rawTarget;
      const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";

      const emailPayload = {
        from: fromAddress,
        to: targetEmail,
        subject: `Nuevo contacto de ${name}`,
        replyTo: email,
        text: `Nombre: ${name}\nCorreo: ${email}\nTeléfono: ${phone || "No provisto"}\nServicio solicitado: ${service || "No especificado"}\nMensaje:\n${message}`,
      };

      let { data, error } = await resend.emails.send(emailPayload);
      console.log("📧 [Resend Direct Send Result]", { data, error });

      // Si el dominio no está verificado aún o la cuenta está restringida a sandbox
      if (
        error &&
        (error.message?.includes("testing emails to your own email address") ||
          error.message?.includes("verify a domain") ||
          error.message?.includes("not verified") ||
          (error as { statusCode?: number }).statusCode === 403)
      ) {
        // `RESEND_SANDBOX_EMAIL` primero, y el regex solo como último
        // recurso. Antes era al revés y por eso se rompió el envío: ese
        // regex busca un correo entre paréntesis, que era el formato del
        // mensaje viejo de Resend ("...to your own email address
        // (tu@correo.com)"). Resend cambió el texto — el error actual de
        // dominio sin verificar no trae paréntesis — así que `match` quedó
        // en null, no había variable de entorno configurada, y el respaldo
        // dejó de actuar en silencio. Una variable explícita no depende de
        // cómo redacte el error un tercero.
        const match = error.message?.match(/\(([^)]+)\)/);
        const ownerEmail = process.env.RESEND_SANDBOX_EMAIL?.trim() || match?.[1];

        if (ownerEmail) {
          console.warn(`⚠️ [Resend Sandbox Fallback] Reenviando a ${ownerEmail} desde onboarding@resend.dev.`);

          const retryResult = await resend.emails.send({
            ...emailPayload,
            from: "SKYCODE Web <onboarding@resend.dev>",
            to: ownerEmail,
          });

          data = retryResult.data;
          error = retryResult.error;
        }
      }

      // El error de Resend se reporta SIEMPRE, no solo cuando además falló
      // la base de datos. Antes estaba dentro del `if (error && !dbSaved)`,
      // así que mientras el lead se guardara bien —el caso normal— un fallo
      // de correo no dejaba rastro en Sentry y nadie se enteraba: los leads
      // entraban al CRM y el aviso por correo nunca llegaba, en silencio.
      // Pasó de verdad: el dominio no estaba verificado en Resend y llevaba
      // semanas devolviendo 403 sin una sola alerta.
      if (error) {
        logError("❌ [Resend] No se pudo enviar el aviso de nuevo lead", error);
      }

      // Si el lead sí quedó guardado, la respuesta al visitante sigue siendo
      // de éxito aunque el correo falle — su mensaje no se perdió, está en
      // el CRM. Solo se le devuelve error si no se guardó en ningún lado.
      if (error && !dbSaved) {
        return NextResponse.json(
          { error: "Inconveniente con el servidor de correo. Intente más tarde o contáctenos por WhatsApp." },
          { status: 400 }
        );
      }
    } catch (emailErr) {
      logError("Error capturado en Resend:", emailErr);
      if (!dbSaved) {
        throw emailErr;
      }
    }

    return NextResponse.json({ success: true, dbSaved });
  } catch (error: unknown) {
    logError("Error en el endpoint de contacto:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al enviar el mensaje." },
      { status: 500 }
    );
  }
}
