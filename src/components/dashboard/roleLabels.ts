import type { Role } from "@/lib/rbac";

/**
 * Nombre visible de cada rol RBAC — la misma etiqueta en Roles y Permisos,
 * Mi Cuenta y la ficha de cada persona, para que el sistema no llame a un
 * mismo rol de dos formas distintas según la pantalla.
 */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  sales_manager: "Comercial",
  traffiker: "Traffiker",
  client: "Cliente (portal)",
};

export function roleLabel(role: string): string {
  return Object.hasOwn(ROLE_LABELS, role) ? ROLE_LABELS[role as Role] : role;
}
