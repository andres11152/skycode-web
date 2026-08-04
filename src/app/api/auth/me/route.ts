import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
