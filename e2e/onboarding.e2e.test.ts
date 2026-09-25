import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs } from "./helpers/client";
import { createOnboardingChecklist, ONBOARDING_STEPS } from "../src/lib/queries/onboarding";
import { createTestClient, createTestProject, createTestProposal, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { withTransaction } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Onboarding de cliente — extremo a extremo", () => {
  it("un cliente ve el checklist de su propio proyecto y marca un ítem", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const project = await createTestProject(client.id);
    await withTransaction((c) => createOnboardingChecklist(project.id, c));

    const browser = await loginAs(clientUser.email, "SuperSecret123456");
    const listRes = await browser.get(`/api/projects/${project.id}/onboarding`);
    expect(listRes.status).toBe(200);
    const { items } = await listRes.json();
    expect(items).toHaveLength(ONBOARDING_STEPS.length);

    const toggleRes = await browser.patch(`/api/projects/${project.id}/onboarding/${items[0].id}`, { completed: true });
    expect(toggleRes.status).toBe(200);

    const after = await (await browser.get(`/api/projects/${project.id}/onboarding`)).json();
    expect(after.items[0].completed).toBe(true);
    expect(after.items[0].completedBy.id).toBe(clientUser.id);
  });

  it("el equipo interno (tasks:write) puede marcar un ítem responsabilidad del cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await withTransaction((c) => createOnboardingChecklist(project.id, c));
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });

    const browser = await loginAs(admin.email, "SuperSecret123456");
    const { items } = await (await browser.get(`/api/projects/${project.id}/onboarding`)).json();
    const clientItem = items.find((i: { responsible: string }) => i.responsible === "client");

    const res = await browser.patch(`/api/projects/${project.id}/onboarding/${clientItem.id}`, { completed: true });
    expect(res.status).toBe(200);
  });

  it("un cliente no puede ver ni marcar el checklist de otro cliente (404)", async () => {
    const ownClient = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: ownClient.id, password: "SuperSecret123456" });
    const otherClient = await createTestClient();
    const otherProject = await createTestProject(otherClient.id);
    await withTransaction((c) => createOnboardingChecklist(otherProject.id, c));

    const browser = await loginAs(clientUser.email, "SuperSecret123456");
    expect((await browser.get(`/api/projects/${otherProject.id}/onboarding`)).status).toBe(404);
    expect((await browser.patch(`/api/projects/${otherProject.id}/onboarding/999999`, { completed: true })).status).toBe(404);
  });

  it("traffiker (sin tasks:read/write) no puede ver ni marcar", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await withTransaction((c) => createOnboardingChecklist(project.id, c));
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });

    const browser = await loginAs(traffiker.email, "SuperSecret123456");
    expect((await browser.get(`/api/projects/${project.id}/onboarding`)).status).toBe(403);
  });

  it("un ítem inexistente da 404 al marcarlo", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await withTransaction((c) => createOnboardingChecklist(project.id, c));
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });

    const browser = await loginAs(admin.email, "SuperSecret123456");
    const res = await browser.patch(`/api/projects/${project.id}/onboarding/999999`, { completed: true });
    expect(res.status).toBe(404);
  });

  it("aceptar una propuesta desde la API crea el checklist automáticamente", async () => {
    const proposal = await createTestProposal({ clientEmail: "onboarding-e2e@test.local" });
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });

    const publicClient = new TestClient();
    const respondRes = await publicClient.post(`/api/proposals/${proposal.id}/respond`, { action: "accept" });
    expect(respondRes.status).toBe(200);
    const { projectId } = await respondRes.json();

    const adminBrowser = await loginAs(admin.email, "SuperSecret123456");
    const onboardingRes = await adminBrowser.get(`/api/projects/${projectId}/onboarding`);
    const { items } = await onboardingRes.json();
    expect(items).toHaveLength(ONBOARDING_STEPS.length);
  });
});
