import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { authenticateUserCredentials, SESSION_LIFETIME_MS } from "@/lib/authService";
import { logError } from "@/lib/logger";

const LoginSchema = z.object({
  email: z.string().email().trim().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`login:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiados intentos de inicio de sesión. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const parsed = LoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña son requeridos." },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    // El límite por IP (arriba) no frena un ataque distribuido contra una
    // sola cuenta (IPs rotadas, CGNAT). Este segundo límite, por email
    // normalizado, sí lo hace — independiente del anterior, así que un
    // atacante necesita evadir ambos a la vez.
    if (isRateLimited(`login-email:${email.trim().toLowerCase()}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiados intentos de inicio de sesión. Intente de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const authResult = await authenticateUserCredentials({
      email,
      password,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    if (!authResult) {
      return NextResponse.json(
        { error: "Credenciales de acceso no válidas." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    });

    // Settear Cookie HTTP-Only segura
    response.cookies.set({
      name: "skycode_session",
      value: authResult.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_LIFETIME_MS / 1000,
      path: "/",
    });

    return response;
  } catch (error) {
    logError("❌ [API Login Error]", error);
    return NextResponse.json(
      { error: "Error de servidor al procesar la autenticación." },
      { status: 500 }
    );
  }
}

