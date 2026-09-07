import { cookies } from "next/headers";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { verifySessionToken } from "@/lib/session";
import { getActiveUserSessions } from "@/lib/queries/sessions";
import { SessionsView } from "@/components/dashboard/SessionsView";

export const metadata: Metadata = {
  title: "Mi Cuenta | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardAccountPage() {
  const session = await requireSessionOrRedirect();

  // La sesión "actual" (para marcarla distinto en la lista) se identifica
  // por su sessionId, que `requireSessionOrRedirect()` no expone — se
  // vuelve a leer la cookie acá, mismo patrón que withAuth.ts.
  const cookieStore = await cookies();
  const token = cookieStore.get("skycode_session")?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const currentSessionId = payload?.sessionId ?? null;

  const sessions = await getActiveUserSessions(session.id);

  return <SessionsView user={session} sessions={sessions} currentSessionId={currentSessionId} />;
}
