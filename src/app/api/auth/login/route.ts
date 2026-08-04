import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initAuthDatabase, comparePassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Asegurar que la tabla y admin estén inicializados
    await initAuthDatabase();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña son requeridos." },
        { status: 400 }
      );
    }

    // Buscar usuario por email en PostgreSQL
    const res = await query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = $1 LIMIT 1;",
      [email.trim().toLowerCase()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Credenciales de acceso no válidas." },
        { status: 401 }
      );
    }

    const user = res.rows[0];

    // Verificar contraseña
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
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
