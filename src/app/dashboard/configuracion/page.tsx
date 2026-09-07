import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getSettings } from "@/lib/queries/settings";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export const metadata: Metadata = {
  title: "Configuración | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardSettingsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "settings:write")) redirect("/dashboard");

  const settings = await getSettings();

  return <SettingsForm initialSettings={settings} />;
}
