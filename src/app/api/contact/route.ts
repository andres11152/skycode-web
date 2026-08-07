import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { contactEmail } from "@/lib/site";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { AttributionFieldsSchema } from "@/lib/attributionSchema";
import { createLead } from "@/lib/queries/leads";

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
  })
  .extend(AttributionFieldsSchema.shape);

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");

  try {
    const ip = getClientIp(request);
    if (isRateLimited(`contact:${ip}`, 10, 10 * 60 * 1000)) {
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

    const { name, email, phone, message } = parsed.data;
    let dbSaved = false;

    // 1. Guardar automáticamente en la Base de Datos PostgreSQL (Render)
    try {
      await createLead({
        ...parsed.data,
        service: "Contacto Web",
        source: "Formulario Directo",
      });
      dbSaved = true;
      console.log("🐘 [PostgreSQL] Lead guardado exitosamente en BD invencheck!");
    } catch (dbErr) {
      console.error("⚠️ [PostgreSQL Lead Warning]", dbErr);
    }

    // Si no hay API Key de Resend válida configurada pero se guardó en BD, retornar éxito
    if (isDummyKey) {
      console.warn("⚠️ [Contacto] RESEND_API_KEY no está configurada o es una clave de prueba.");
      console.log("📥 Mensaje recibido y guardado:", { name, email, phone, message });

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
        text: `Nombre: ${name}\nCorreo: ${email}\nTeléfono: ${phone || "No provisto"}\nMensaje:\n${message}`,
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
        const match = error.message?.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1] : (process.env.RESEND_SANDBOX_EMAIL || "cre8tive.pro.info@gmail.com");

        console.warn(`⚠️ [Resend Sandbox Fallback] Reenviando a ${ownerEmail} desde onboarding@resend.dev.`);

        const retryResult = await resend.emails.send({
          ...emailPayload,
          from: "SKYCODE Web <onboarding@resend.dev>",
          to: ownerEmail,
        });

        data = retryResult.data;
        error = retryResult.error;
      }

      if (error && !dbSaved) {
        console.error("Error de Resend al enviar correo:", error);
        return NextResponse.json(
          { error: "Inconveniente con el servidor de correo. Intente más tarde o contáctenos por WhatsApp." },
          { status: 400 }
        );
      }
    } catch (emailErr) {
      console.error("Error capturado en Resend:", emailErr);
      if (!dbSaved) {
        throw emailErr;
      }
    }

    return NextResponse.json({ success: true, dbSaved });
  } catch (error: unknown) {
    console.error("Error en el endpoint de contacto:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al enviar el mensaje." },
      { status: 500 }
    );
  }
}
