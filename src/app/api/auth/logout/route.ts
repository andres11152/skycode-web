import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { logoutUserSession } from "@/lib/authService";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("skycode_session")?.value;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await logoutUserSession(payload.sessionId);
    }
  }

  const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente." });

  // Expira la cookie HTTP-only inmediatamente — mismos atributos
  // (`secure`/`sameSite`) que cuando se creó en login/reset-password/
  // verify-2fa, por consistencia: el navegador ya identifica la cookie a
  // borrar solo por nombre+dominio+path (`secure`/`sameSite` no son parte
  // de esa identidad, así que esto no cambia si la cookie se borra o no),
  // pero declararlos igual evita que esta sea la única escritura de esta
  // cookie en todo el proyecto con un set de atributos distinto.
  response.cookies.set({
    name: "skycode_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  return response;
}

