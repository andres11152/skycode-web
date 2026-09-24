import { requireSessionOrRedirect } from "@/lib/withAuth";
import { getClientProjects } from "@/lib/queries/projects";
import { getClientInvoices } from "@/lib/queries/invoices";
import { getClientDocuments } from "@/lib/queries/documents";
import { getClientTickets } from "@/lib/queries/supportTickets";
import { PortalView } from "@/components/portal/PortalView";

type PageProps = {
  // `?bold-order-id=...&bold-tx-status=...` que Bold agrega al volver del
  // checkout (ver lib/bold.ts) — se leen acá (Server Component) en vez de
  // con `useSearchParams()` en PortalView.tsx, para no tener que envolver
  // ese componente en <Suspense> solo por esto.
  searchParams: Promise<{ "bold-order-id"?: string }>;
};

export default async function PortalPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  const { "bold-order-id": boldOrderId } = await searchParams;

  if (!session.clientId) {
    return (
      <PortalView
        projects={[]}
        invoices={[]}
        documents={[]}
        tickets={[]}
        projectOptions={[]}
        boldOrderId={boldOrderId}
      />
    );
  }

  const [projects, invoices, documents, tickets] = await Promise.all([
    getClientProjects(session.clientId),
    getClientInvoices(session.clientId),
    getClientDocuments(session.clientId),
    getClientTickets(session.clientId),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, title: p.title, client_name: p.client.name }));

  return (
    <PortalView
      projects={projects}
      invoices={invoices}
      documents={documents}
      tickets={tickets}
      projectOptions={projectOptions}
      boldOrderId={boldOrderId}
    />
  );
}
