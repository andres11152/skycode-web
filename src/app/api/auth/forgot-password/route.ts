import { NextResponse } from "next/server";
import { Resend } from "resend";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query } from "@/lib/db";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { findUserByEmail } from "@/lib/queries/auth";
import { createPasswordResetToken } from "@/lib/queries/passwordReset";
import { logAudit } from "@/lib/audit";
import { logError } from "@/lib/logger";

const RequestSchema = z.object({ email: z.string().email().trim().max(254) });

const RESET_LIFETIME_MS = 60 * 60 * 1000; // 1 hora — más corto que una invitación de equipo (3 días) a propósito

const GENERIC_MESSAGE =
  "Si existe una cuenta con ese correo, enviamos un enlace para restablecer la contraseña.";

/**
 * POST /api/auth/forgot-password - Público, sin sesión (por definición,
 * quien la pide no puede iniciar sesión). Responde el MISMO mensaje
 * genérico exista o no la cuenta con ese correo — nunca confirma ni
 * niega si un email está registrado (enumeration attack). A diferencia
 * de `POST /api/team/invite` (donde el enlace se devuelve directo si
 * Resend no está configurado, porque quien llama ya tiene `team:write`),
 * acá el enlace **nunca** puede ir en la respuesta: cualquiera podría
 * pedir el reseteo de la cuenta de otra persona y tomar el control con el
 * link devuelto. Sin Resend configurado, el enlace solo se loguea server-side
 * (para poder probar el flujo en desarrollo local).
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`forgot-password:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 400 });
    }
    const { email } = parsed.data;

    // Mismo rate limit por email normalizado que login/team-accept — evita
    // que alguien agote el límite por IP rotando IPs contra una cuenta puntual.
    if (isRateLimited(`forgot-password-email:${email.trim().toLowerCase()}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." }, { status: 429 });
    }

    const user = await findUserByEmail(email);

    // Sin cuenta, o cuenta desactivada: mismo mensaje genérico, sin crear
    // token ni enviar nada — pero sin revelar la diferencia en el timing
    // de forma significativa (la consulta ya se hizo arriba en ambos casos).
    if (!user || user.status !== "active") {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + RESET_LIFETIME_MS);
    await createPasswordResetToken({ id: token, userId: user.id, expiresAt });

    await logAudit(query, {
      actorId: user.id,
      actorEmail: user.email,
      action: "user.request_password_reset",
      entityType: "user",
      entityId: user.id,
      ip,
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/resetear-password/${token}`;

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");

    if (!isDummyKey) {
      try {
        const resend = new Resend(apiKey);
        const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";
        await resend.emails.send({
          from: fromAddress,
          to: user.email,
          subject: "Restablecer tu contraseña de SKYCODE Agency",
          text: `Recibimos una solicitud para restablecer tu contraseña.\n\nSi fuiste tú, hazlo acá (válido por 1 hora):\n${resetUrl}\n\nSi no fuiste tú, ignora este correo — tu contraseña no cambia hasta que abras el enlace.`,
        });
      } catch (emailErr) {
        logError("⚠️ [Forgot Password Resend Warning]", emailErr);
      }
    } else {
      // Solo en consola del servidor, nunca en la respuesta HTTP — ver el
      // comentario de arriba sobre por qué este enlace no puede filtrarse
      // al cliente que hizo la request.
      console.warn(`⚠️ [Forgot Password] RESEND_API_KEY no configurada. Enlace de reseteo: ${resetUrl}`);
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    logError("❌ [API POST Forgot Password Error]", error);
    // Genérico también en el error inesperado — no distinguir "falló" de
    // "no existe" por el tipo de respuesta.
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }
}
