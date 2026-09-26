import type { Metadata } from "next";
import { AcceptInviteView } from "@/components/auth/AcceptInviteView";
// globals.css excluye `components/auth`/`app/invitar` de su escaneo de
// Tailwind (ver el comentario ahí) — este import trae de vuelta esas
// utilidades solo para esta página.
import "../../dashboard.css";

export const metadata: Metadata = {
  title: "Activar invitación | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  return <AcceptInviteView token={token} />;
}
