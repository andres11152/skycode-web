import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { logoutUserSession } from "@/lib/authService";
import { SESSION_COOKIE_NAME, clearSessionCookie } from "@/lib/sessionCookie";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await logoutUserSession(payload.sessionId);
    }
  }

  const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente." });

  // Expira la cookie HTTP-only con los mismos atributos con que se creó.
  clearSessionCookie(response);

  return response;
}

