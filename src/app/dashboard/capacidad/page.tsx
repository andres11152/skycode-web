import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getTeamCapacity } from "@/lib/queries/capacity";
import { CapacityView } from "@/components/dashboard/CapacityView";

export const metadata: Metadata = {
  title: "Capacidad del Equipo | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardCapacityPage() {
  const session = await requireSessionOrRedirect();
  // Reutiliza tasks:read — es una vista derivada de las mismas
  // asignaciones que ya gatea ese permiso, no información más sensible
  // que justifique un permiso `capacity:*` propio.
  if (!hasPermission(session.role, "tasks:read")) redirect("/dashboard");

  const capacity = await getTeamCapacity();

  return <CapacityView capacity={capacity} />;
}
