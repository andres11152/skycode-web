import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getClientDetail, getClientPortalUsers } from "@/lib/queries/clients";
import { getClientActivities } from "@/lib/queries/clientActivities";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { ClientDetailView } from "@/components/dashboard/ClientDetailView";

export const metadata: Metadata = {
  title: "Ficha de Cliente | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardClientDetailPage({ params }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "clients:read")) redirect("/dashboard");

  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) notFound();

  const usdToCopRate = await getUsdToCopRate();
  const [client, activities, portalUsers] = await Promise.all([
    getClientDetail(clientId, usdToCopRate),
    getClientActivities(clientId),
    getClientPortalUsers(clientId),
  ]);
  if (!client) notFound();

  return (
    <ClientDetailView
      client={client}
      canWrite={hasPermission(session.role, "clients:write")}
      canManagePrivacy={hasPermission(session.role, "data_privacy:manage")}
      initialActivities={activities}
      portalUsers={portalUsers}
    />
  );
}
