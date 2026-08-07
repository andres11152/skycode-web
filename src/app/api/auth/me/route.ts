import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { resolveSession } from "@/lib/authSession";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Resuelve contra la base, no contra el JWT: el rol siempre es el
    // actual, y una sesión revocada o un usuario desactivado dejan de
    // pasar acá de inmediato.
    const user = await resolveSession(payload.sessionId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
