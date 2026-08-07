import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { PortalChrome } from "@/components/portal/PortalChrome";

export const metadata: Metadata = {
  title: "Portal de Cliente | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect();

  // El portal es solo para clientes — alguien del equipo que llega acá
  // (por enlace viejo, marcador, etc.) va al panel interno, no a un
  // portal vacío sin proyectos propios.
  if (session.role !== "client") redirect("/dashboard");

  return <PortalChrome user={session}>{children}</PortalChrome>;
}
