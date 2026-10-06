import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Health check para Render: confirma que la instancia responde Y que la base
// es alcanzable. Sin sesión a propósito y sin datos internos en la respuesta.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await Promise.race([
      query("SELECT 1;"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
