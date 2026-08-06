import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { initAuthDatabase, comparePassword } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

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

    // Asegurar que la tabla y admin estén inicializados
    await initAuthDatabase();

    const parsed = LoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña son requeridos." },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    // Buscar usuario por email en PostgreSQL
    const res = await query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = $1 LIMIT 1;",
      [email.toLowerCase()]
    );

    const user = res.rows[0] || null;
    // Siempre comparar contra un hash, incluso si el usuario no existe, para evitar
    // un oráculo de timing que revele qué correos tienen cuenta.
    // Usar un hash dummy si el usuario no existe garantiza ~igual tiempo de bcrypt.compare().
    const passwordHashToCheck = user?.password_hash || "$2b$10$dummyhashfornonexistentusers1234567890";
    const isValid = await comparePassword(password, passwordHashToCheck);

    if (!user || !isValid) {
      return NextResponse.json(
        { error: "Credenciales de acceso no válidas." },
        { status: 401 }
      );
    }

    // Crear Token JWT y Cookie HTTP-Only
    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Settear Cookie HTTP-Only segura
    response.cookies.set({
      name: "skycode_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("❌ [API Login Error]", error);
    return NextResponse.json(
      { error: "Error de servidor al procesar la autenticación." },
      { status: 500 }
    );
  }
}
