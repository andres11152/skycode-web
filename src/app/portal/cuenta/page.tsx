import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { AccountView } from "@/components/dashboard/AccountView";

export const metadata: Metadata = {
  title: "Mi Cuenta | Portal de Cliente",
  robots: { index: false, follow: false },
};

/**
 * Primera sub-ruta de `/portal` (antes era una sola página con pestañas).
 * Se justifica como ruta propia y no como una pestaña más de `PortalView`:
 * las pestañas de esa página son vistas de los PROYECTOS del cliente, y
 * esto es su cuenta personal — mezclarlo ahí lo escondería entre facturas
 * y documentos. El guard de rol (`portal/layout.tsx`) ya aplica a esta
 * ruta sin cambios: solo `client` llega acá.
 */
export default async function PortalAccountPage() {
  const session = await requireSessionOrRedirect();
  return <AccountView userId={session.id} audience="client" />;
}
