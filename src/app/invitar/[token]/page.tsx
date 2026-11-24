import type { Metadata } from "next";
import { AcceptInviteView } from "@/components/auth/AcceptInviteView";
import { findValidInvite } from "@/lib/queries/team";
// globals.css excluye `components/auth`/`app/invitar` de su escaneo de
// Tailwind (ver el comentario ahí) — este import trae de vuelta esas
// utilidades solo para esta página.
import "../../dashboard.css";

export const metadata: Metadata = {
  title: "Activar invitación | SKYCODE Agency",
  robots: { index: false, follow: false },
};

// Dinámica a propósito: ver src/lib/csp.ts (el nonce exige render por request).
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  // Un token con formato inválido no debe llegar a Postgres (el id es UUID): se muestra la vista de equipo y el
  // envío falla con el mensaje normal de "invitación no válida".
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  const invite = isUuid ? await findValidInvite(token).catch(() => null) : null;
  return <AcceptInviteView token={token} audience={invite?.role === "client" ? "client" : "team"} />;
}
