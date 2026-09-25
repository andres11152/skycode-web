import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { saveSubscription, deleteSubscription } from "@/lib/queries/pushSubscriptions";
import { logError } from "@/lib/logger";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST /api/push/subscribe - Autogestión pura, sin permiso RBAC (cualquier
 * sesión activa notificaciones push para sí misma, mismo criterio que 2FA
 * o revocar sesiones propias). El navegador ya hizo el trabajo de pedir
 * permiso y suscribirse a `PushManager` antes de llamar acá — esta ruta
 * solo persiste el resultado.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const parsed = SubscribeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  }

  try {
    await saveSubscription(session.id, {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Push Subscribe Error]", error);
    return NextResponse.json({ error: "No se pudo guardar la suscripción." }, { status: 500 });
  }
}

const UnsubscribeSchema = z.object({ endpoint: z.string().url() });

/** DELETE /api/push/subscribe - Solo borra la propia suscripción del que llama, `WHERE user_id = $1` en la query es la única barrera. */
export async function DELETE(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const parsed = UnsubscribeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    await deleteSubscription(session.id, parsed.data.endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Push Subscribe Error]", error);
    return NextResponse.json({ error: "No se pudo eliminar la suscripción." }, { status: 500 });
  }
}
