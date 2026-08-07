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

  // Expira la cookie HTTP-only inmediatamente
  response.cookies.set({
    name: "skycode_session",
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}

