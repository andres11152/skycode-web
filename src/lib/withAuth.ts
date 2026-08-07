import { cache } from "react";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, type UserSession } from "./session";
import { resolveSession } from "./authSession";
import { hasPermission, type Permission } from "./rbac";

export interface AuthedContext {
  session: UserSession;
}

/**
 * Resuelve la sesión autenticada desde la cookie httpOnly, sin exigir un
 * permiso de rol específico. Para endpoints con lógica de acceso propia que
 * no se expresa como "este rol puede esto" — ej. `/api/projects` GET, donde
 * un cliente ve solo lo suyo por dueño, no por permiso.
 */
export async function requireSession(): Promise<{ session: UserSession } | { error: NextResponse }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("skycode_session")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 }) };
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 }) };
  }

  const session = await resolveSession(payload.sessionId);
  if (!session) {
    return { error: NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 }) };
  }

  return { session };
}

/**
 * Equivalente a `requireSession()` pero para Server Components (donde no
 * tiene sentido devolver un `NextResponse`): redirige a `/login` en vez de
 * devolver un error. Usado por los `layout.tsx` de `/dashboard` y `/portal`,
 * y otra vez por cada `page.tsx` anidado que necesite el rol.
 *
 * Envuelta en `cache()` de React: dentro de un mismo request, el layout y
 * la page llaman esto por separado, pero solo se resuelve una vez — el
 * resto son lecturas de la memoización, no queries repetidas.
 */
export const requireSessionOrRedirect = cache(async (): Promise<UserSession> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("skycode_session")?.value;
  if (!token) redirect("/login");

  const payload = await verifySessionToken(token);
  if (!payload) redirect("/login");

  const session = await resolveSession(payload.sessionId);
  if (!session) redirect("/login");

  return session;
});

type Handler = (request: Request, ctx: AuthedContext) => Promise<Response> | Response;

/**
 * Envuelve un Route Handler exigiendo que la sesión activa tenga el permiso
 * indicado (ver lib/rbac.ts). Reemplaza el patrón `if (session.role !==
 * "admin")` copiado a mano endpoint por endpoint — ese patrón ya causó un
 * fallo de autorización real en este proyecto (un handler comparaba la
 * sesión pero olvidaba el rol).
 */
export function withAuth(permission: Permission, handler: Handler) {
  return async (request: Request): Promise<Response> => {
    const result = await requireSession();
    if ("error" in result) return result.error;

    if (!hasPermission(result.session.role, permission)) {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    return handler(request, { session: result.session });
  };
}
