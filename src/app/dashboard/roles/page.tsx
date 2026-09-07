import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { RolesMatrix } from "@/components/dashboard/RolesMatrix";

export const metadata: Metadata = {
  title: "Roles y Permisos | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardRolesPage() {
  const session = await requireSessionOrRedirect();
  // Mismo permiso que Equipo (team:read, solo admin) — quien administra
  // personas debe poder ver qué puede hacer cada rol, no es información
  // separada.
  if (!hasPermission(session.role, "team:read")) redirect("/dashboard");

  return <RolesMatrix />;
}
