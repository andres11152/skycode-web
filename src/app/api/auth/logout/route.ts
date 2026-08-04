import { NextResponse } from "next/server";

export async function POST() {
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
