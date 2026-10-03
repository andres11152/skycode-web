import type { NextResponse } from "next/server";

// Sin dependencias de Node (pg, bcrypt) a propósito: lo importa proxy.ts, que
// corre en Edge Runtime (mismo criterio que lib/session.ts).

export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Nombre de la cookie de sesión. En producción lleva el prefijo `__Host-`:
 * el navegador solo la acepta si es `Secure`, tiene `Path=/` y NO tiene
 * `Domain` — así un subdominio comprometido (o un atacante que controle un
 * hermano de `skycode.agency`) no puede plantar ni sobrescribir una cookie
 * con este nombre. En desarrollo (`next dev` sobre http://localhost) no se
 * usa el prefijo porque exige `Secure`, que ahí no aplica.
 *
 * Cambiar el nombre cierra una vez todas las sesiones abiertas al desplegar
 * (la cookie vieja `skycode_session` deja de leerse) — es un costo único y
 * deliberado, no un bug.
 */
export const SESSION_COOKIE_NAME = IS_PRODUCTION ? "__Host-skycode_session" : "skycode_session";

/**
 * `SameSite=Lax` (no Strict) a propósito: con Strict, abrir /dashboard desde
 * un enlace de un correo o notificación llegaría SIN cookie y redirigiría a
 * /login aunque la persona tenga sesión. El riesgo CSRF que Lax deja abierto
 * lo cubre la validación de `Origin`/Fetch Metadata de proxy.ts.
 */
function baseOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({ ...baseOptions(), value: token, maxAge: SESSION_LIFETIME_MS / 1000 });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({ ...baseOptions(), value: "", expires: new Date(0) });
}
