import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { LandingEventSchema } from "@/lib/landingEventSchema";
import { readJsonBody } from "@/lib/readJsonBody";
import { recordLandingEvent } from "@/lib/queries/landingEvents";
import { logError } from "@/lib/logger";

// Pública y sin sesión: la llama el navegador de quien visita una landing de
// campaña (ver lib/landingEvents.ts). Registra un contador anónimo, sin IP ni
// datos de la persona.
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (await isRateLimited(`landing-events:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const parsed = LandingEventSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Evento no válido." }, { status: 400 });
  }

  try {
    await recordLandingEvent(parsed.data);
  } catch (error) {
    logError("⚠️ [Landing events] No se pudo registrar el evento", error);
    return NextResponse.json({ error: "No se pudo registrar el evento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
