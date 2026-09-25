import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getTasksAssignedToUser } from "@/lib/queries/tasks";
import { MyTasksView } from "@/components/dashboard/MyTasksView";

export const metadata: Metadata = {
  title: "Mis Tareas | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardMyTasksPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "tasks:read")) redirect("/dashboard");

  const tasks = await getTasksAssignedToUser(session.id);

  return <MyTasksView initialTasks={tasks} />;
}
