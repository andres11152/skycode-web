import type { Metadata } from "next";
import { LeadsDashboardView } from "@/components/dashboard/LeadsDashboardView";

export const metadata: Metadata = {
  title: "Dashboard de Prospectos | SKYCODE Agency",
  description: "Panel de control y gestión de leads en tiempo real.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return <LeadsDashboardView />;
}
