import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { invalidateSessionCache } from "@/lib/authSession";
import { getUserProfile, updateOwnProfile } from "@/lib/queries/userProfile";
import { OwnProfileSchema } from "@/lib/profileValidation";
import { logError } from "@/lib/logger";

/**
 * GET /api/account/profile - El perfil de quien llama. Sin permiso RBAC:
 * autogestión pura, igual que 2FA o las sesiones propias — los 4 roles
 * (incluido `client`) tienen derecho a ver sus propios datos.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const profile = await getUserProfile(auth.session.id);
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ success: true, profile });
}

/**
 * PATCH /api/account/profile - Edita el perfil propio (nombre, teléfono,
 * bio, zona horaria, idioma).
 *
 * El usuario a editar sale SIEMPRE de `session.id`, nunca del body: el
 * schema es `.strict()`, así que mandar un `id` (o `email`, `role`) es un
 * 400 en vez de ignorarse en silencio — cualquier intento de editar a otra
 * persona por esta ruta queda visible como error, no "funciona a medias".
 */
export async function PATCH(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session, sessionId } = auth;

  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = OwnProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const profile = await withTransaction(async (client) => {
      const before = await getUserProfile(session.id);
      const updated = await updateOwnProfile(session.id, parsed.data, client);
      if (!updated || !before) return null;

      // El diff guarda solo los campos que cambiaron — el perfil completo
      // (correo incluido) no aporta nada al historial y lo engordaría.
      const changedKeys = Object.keys(parsed.data) as (keyof typeof parsed.data)[];
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "user.profile_update",
        entityType: "user",
        entityId: session.id,
        diff: {
          before: Object.fromEntries(changedKeys.map((k) => [k, before[k]])),
          after: Object.fromEntries(changedKeys.map((k) => [k, updated[k]])),
        },
        ip,
      });
      return updated;
    });

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }

    // El nombre vive en la sesión cacheada 15s por `resolveSession()` — sin
    // esto, el header seguiría mostrando el nombre viejo hasta que expire.
    invalidateSessionCache(sessionId);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    logError("❌ [API PATCH Account Profile Error]", error);
    return NextResponse.json({ error: "Error al actualizar el perfil." }, { status: 500 });
  }
}
