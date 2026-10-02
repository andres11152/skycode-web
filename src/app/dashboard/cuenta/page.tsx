import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { AccountView } from "@/components/dashboard/AccountView";

export const metadata: Metadata = {
  title: "Mi Cuenta | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardAccountPage() {
  const session = await requireSessionOrRedirect();
  return <AccountView userId={session.id} audience="team" />;
}
