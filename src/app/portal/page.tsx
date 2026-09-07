import { requireSessionOrRedirect } from "@/lib/withAuth";
import { getClientProjects } from "@/lib/queries/projects";
import { getClientInvoices } from "@/lib/queries/invoices";
import { getClientDocuments } from "@/lib/queries/documents";
import { getClientTickets } from "@/lib/queries/supportTickets";
import { PortalView } from "@/components/portal/PortalView";

export default async function PortalPage() {
  const session = await requireSessionOrRedirect();

  if (!session.clientId) {
    return <PortalView projects={[]} invoices={[]} documents={[]} tickets={[]} projectOptions={[]} />;
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
    />
  );
}
