import type { Metadata } from "next";
import { AcceptInviteView } from "@/components/auth/AcceptInviteView";

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
