import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs, uniqueSuffix } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

async function createProposal(authedClient: TestClient, overrides: Record<string, unknown> = {}) {
  const res = await authedClient.post("/api/proposals", {
    client_email: `cliente-${uniqueSuffix()}@test.local`,
    client_name: "Cliente Propuesta",
    title: "Rediseño de sitio web",
    currency: "USD",
    tax_rate: 19,
    items: [
      { description: "Diseño UI/UX", quantity: 1, unit_price: 500 },
      { description: "Desarrollo Frontend", quantity: 2, unit_price: 300 },
    ],
    ...overrides,
  });
  expect(res.status).toBe(200);
  return res.json();
}

describe("Ciclo de vida completo de una propuesta comercial", () => {
  it("crear -> ver públicamente (marca viewed_at) -> aceptar -> crea cliente y proyecto con sprints", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const authedClient = await loginAs(salesManager.email, "SuperSecret123456");

    const { proposal } = await createProposal(authedClient, { client_email: "nuevo-cliente@test.local" });
    expect(proposal.status).toBe("sent");
    expect(proposal.subtotal).toBe(1100); // 500 + 2*300
    expect(proposal.total).toBeCloseTo(1309, 5); // 1100 * 1.19

    // El cliente (sin cuenta) abre el enlace público por primera vez.
    const publicClient = new TestClient();
    const viewRes = await publicClient.get(`/api/proposals/${proposal.id}`);
    expect(viewRes.status).toBe(200);
    const viewed = await viewRes.json();
    expect(viewed.proposal.status).toBe("viewed");
    expect(viewed.proposal.viewed_at).not.toBeNull();

    // Una segunda vista no debe pisar el viewed_at original ni romper nada.
    const secondView = await publicClient.get(`/api/proposals/${proposal.id}`);
    expect(secondView.status).toBe(200);

    // No hay ningún cliente ni proyecto todavía — solo se crean al aceptar.
    const beforeAccept = await query("SELECT COUNT(*) FROM clients WHERE email = $1;", ["nuevo-cliente@test.local"]);
    expect(Number(beforeAccept.rows[0].count)).toBe(0);

    const acceptRes = await publicClient.post(`/api/proposals/${proposal.id}/respond`, { action: "accept" });
    expect(acceptRes.status).toBe(200);
    const accepted = await acceptRes.json();
    expect(accepted.status).toBe("accepted");
    expect(accepted.projectId).toBeTruthy();

    const clientRow = await query("SELECT id FROM clients WHERE email = $1;", ["nuevo-cliente@test.local"]);
    expect(clientRow.rows).toHaveLength(1);

    const projectRow = await query("SELECT id, title, status, client_id FROM projects WHERE id = $1;", [
      accepted.projectId,
    ]);
    expect(projectRow.rows[0].title).toBe("Rediseño de sitio web");
    expect(projectRow.rows[0].status).toBe("Planificación");
    expect(projectRow.rows[0].client_id).toBe(clientRow.rows[0].id);

    const sprintsRow = await query("SELECT title FROM sprints WHERE project_id = $1 ORDER BY id ASC;", [
      accepted.projectId,
    ]);
    expect(sprintsRow.rows.map((r) => r.title)).toEqual(["Diseño UI/UX (x1)", "Desarrollo Frontend (x2)"]);

    const proposalRow = await query("SELECT accepted_at, accepted_project_id FROM proposals WHERE id = $1;", [
      proposal.id,
    ]);
    expect(proposalRow.rows[0].accepted_at).not.toBeNull();
    expect(proposalRow.rows[0].accepted_project_id).toBe(accepted.projectId);
  });

  it("un cliente que ya existe (mismo email) se reutiliza, no se duplica al aceptar", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const authedClient = await loginAs(admin.email, "SuperSecret123456");
    const sharedEmail = `repetido-${uniqueSuffix()}@test.local`;

    const { proposal: proposalA } = await createProposal(authedClient, { client_email: sharedEmail });
    const clientA = new TestClient();
    await clientA.post(`/api/proposals/${proposalA.id}/respond`, { action: "accept" });

    const { proposal: proposalB } = await createProposal(authedClient, { client_email: sharedEmail });
    const clientB = new TestClient();
    const acceptB = await clientB.post(`/api/proposals/${proposalB.id}/respond`, { action: "accept" });
    const acceptedB = await acceptB.json();

    const clientsRow = await query("SELECT id FROM clients WHERE email = $1;", [sharedEmail]);
    expect(clientsRow.rows).toHaveLength(1); // no duplicado

    const projectsRow = await query("SELECT COUNT(*) FROM projects WHERE client_id = $1;", [clientsRow.rows[0].id]);
    expect(Number(projectsRow.rows[0].count)).toBe(2); // dos propuestas -> dos proyectos, un solo cliente
    expect(acceptedB.projectId).toBeTruthy();
  });

  it("rechazar una propuesta no crea cliente fantasma", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const authedClient = await loginAs(admin.email, "SuperSecret123456");
    const email = `rechazado-${uniqueSuffix()}@test.local`;

    const { proposal } = await createProposal(authedClient, { client_email: email });
    const publicClient = new TestClient();

    const rejectRes = await publicClient.post(`/api/proposals/${proposal.id}/respond`, { action: "reject" });
    expect(rejectRes.status).toBe(200);
    const rejected = await rejectRes.json();
    expect(rejected.status).toBe("rejected");

    const clientRow = await query("SELECT COUNT(*) FROM clients WHERE email = $1;", [email]);
    expect(Number(clientRow.rows[0].count)).toBe(0);

    const proposalStatus = await query("SELECT rejected_at, accepted_project_id FROM proposals WHERE id = $1;", [
      proposal.id,
    ]);
    expect(proposalStatus.rows[0].rejected_at).not.toBeNull();
    expect(proposalStatus.rows[0].accepted_project_id).toBeNull();
  });

  it("una propuesta ya respondida no se puede volver a responder", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const authedClient = await loginAs(admin.email, "SuperSecret123456");

    const { proposal } = await createProposal(authedClient);
    const publicClient = new TestClient();
    await publicClient.post(`/api/proposals/${proposal.id}/respond`, { action: "reject" });

    const secondAttempt = await publicClient.post(`/api/proposals/${proposal.id}/respond`, { action: "accept" });
    expect(secondAttempt.status).toBe(400);
  });

  it("un UUID que no existe da 404 tanto en la vista pública como al responder", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const client = new TestClient();

    const viewRes = await client.get(`/api/proposals/${fakeId}`);
    expect(viewRes.status).toBe(404);

    const respondRes = await client.post(`/api/proposals/${fakeId}/respond`, { action: "accept" });
    expect(respondRes.status).toBe(404);
  });

  it("un traffiker no puede crear propuestas (403), un cliente tampoco", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const trafClient = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await trafClient.post("/api/proposals", {
      client_email: "x@test.local",
      client_name: "X",
      title: "X",
      items: [{ description: "X", quantity: 1, unit_price: 1 }],
    });
    expect(res.status).toBe(403);
  });
});
