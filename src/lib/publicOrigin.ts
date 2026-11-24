import { siteUrl } from "@/lib/site";

/**
 * Origen público para armar enlaces que se mandan por correo (restablecer contraseña, invitaciones, propuestas).
 *
 * `new URL(request.url).origin` NO sirve en producción: detrás del proxy de Render el servidor escucha en
 * `localhost:10000`, y los enlaces salían como `https://localhost:10000/resetear-password/...` (bug real, visto en el
 * correo de restablecimiento del 2026-11-23). En producción se usa el dominio canónico; en desarrollo y en el servidor
 * E2E (`SKYCODE_E2E=1`) se conserva el origen de la petición para que los enlaces apunten al servidor local.
 */
export function publicOrigin(request: Request): string {
  if (process.env.NODE_ENV !== "production" || process.env.SKYCODE_E2E === "1") {
    return new URL(request.url).origin;
  }
  return siteUrl;
}
