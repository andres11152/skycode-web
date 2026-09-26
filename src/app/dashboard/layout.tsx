import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";
// globals.css (layout raíz) excluye `components/dashboard`/`app/dashboard`
// de su escaneo de Tailwind (ver el comentario ahí) — este import trae de
// vuelta esas utilidades solo para el subárbol de /dashboard.
import "../dashboard.css";

export const metadata: Metadata = {
  title: "Panel Interno | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect();

  // El panel interno es solo para equipo — un cliente que llega acá (por
  // enlace viejo, marcador, etc.) va a su portal, no a un 403 confuso.
  if (session.role === "client") redirect("/portal");

  return <DashboardChrome user={session}>{children}</DashboardChrome>;
}
