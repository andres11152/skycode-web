import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactEmail } from "@/lib/site";
import { query } from "@/lib/db";
import { initAuthDatabase } from "@/lib/auth";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");

  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Todos los campos (nombre, correo y mensaje) son requeridos." },
        { status: 400 }
      );
    }

    // 1. Guardar automáticamente en la Base de Datos PostgreSQL (Render)
    try {
      await initAuthDatabase();
      await query(
        `INSERT INTO leads (name, email, phone, service, message, source, status)
         VALUES ($1, $2, $3, 'Contacto Web', $4, 'Formulario Directo', 'Nuevo');`,
        [name.trim(), email.trim().toLowerCase(), phone || "", message]
      );
      console.log("🐘 [PostgreSQL] Lead guardado exitosamente en BD invencheck!");
    } catch (dbErr) {
      console.error("⚠️ [PostgreSQL Lead Warning]", dbErr);
    }

    // Si no hay API Key de Resend válida configurada
    if (isDummyKey) {
      console.warn("⚠️ [Contacto] RESEND_API_KEY no está configurada o es una clave de prueba.");
      console.log("📥 Mensaje recibido:", { name, email, message });

      // En desarrollo simulamos éxito para poder probar la interfaz sin bloqueos
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          success: true,
          devMode: true,
          notice: "Modo desarrollo: Mensaje simulado en consola.",
        });
      }

      return NextResponse.json(
        { error: "El servicio de envío de correos no está configurado en el servidor. Por favor contáctenos por WhatsApp o correo." },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const targetEmail = process.env.CONTACT_RECEIVER_EMAIL || contactEmail || "contact@skycode.agency";
    const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";

    const emailPayload = {
      from: fromAddress,
      to: targetEmail,
      subject: `Nuevo contacto de ${name}`,
      replyTo: email,
      text: `Nombre: ${name}\nCorreo: ${email}\nTeléfono: ${phone || "No provisto"}\nMensaje:\n${message}`,
    };

    let { data, error } = await resend.emails.send(emailPayload);

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

      console.warn(`⚠️ [Resend Sandbox Fallback] Dominio skycode.agency en verificación. Reenviando a ${ownerEmail} desde onboarding@resend.dev.`);

      const retryResult = await resend.emails.send({
        ...emailPayload,
        from: "SKYCODE Web <onboarding@resend.dev>",
        to: ownerEmail,
      });

      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Error de Resend al enviar correo:", error);
      const isApiKeyError = error.message?.toLowerCase().includes("api key") || error.name === "invalid_api_key";
      const userFacingError = isApiKeyError
        ? "El servidor de correo no tiene una clave API válida configurada. Por favor contáctenos por WhatsApp o correo."
        : "Ocurrió un inconveniente al procesar el envío. Por favor intente más tarde o contáctenos por WhatsApp.";

      return NextResponse.json({ error: userFacingError }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error en el endpoint de contacto:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al enviar el mensaje." },
      { status: 500 }
    );
  }
}
