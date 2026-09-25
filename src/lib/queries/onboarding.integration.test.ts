import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  createOnboardingChecklist,
  getOnboardingItems,
  isOnboardingItemInProject,
  toggleOnboardingItem,
} from "./onboarding";
import { createProjectWithClient } from "./projects";
import { acceptProposalAndCreateProject, getProposalById } from "./proposals";
import { withTransaction } from "../db";
import { createTestClient, createTestProject, createTestProposal, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createOnboardingChecklist / getOnboardingItems", () => {
  it("crea los 6 ítems del catálogo fijo, en orden, sin completar", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    await withTransaction((c) => createOnboardingChecklist(project.id, c));

    const items = await getOnboardingItems(project.id);
    expect(items).toHaveLength(ONBOARDING_STEPS.length);
    expect(items.map((i) => i.stepKey)).toEqual(ONBOARDING_STEPS.map((s) => s.key));
    expect(items.every((i) => !i.completed)).toBe(true);
  });

  it("un proyecto sin checklist creado devuelve una lista vacía (sin backfill retroactivo)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    expect(await getOnboardingItems(project.id)).toEqual([]);
  });
});

describe("toggleOnboardingItem", () => {
  it("marca un ítem como completo con quién lo completó", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser({ name: "Ana" });
    await withTransaction((c) => createOnboardingChecklist(project.id, c));

    const [item] = await getOnboardingItems(project.id);
    const toggled = await toggleOnboardingItem(item.id, true, user.id);
    expect(toggled).toBe(true);

    const [after] = await getOnboardingItems(project.id);
    expect(after.completed).toBe(true);
    expect(after.completedBy).toEqual({ id: user.id, name: "Ana" });
  });

  it("desmarcar limpia completedAt y completedBy juntos", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    await withTransaction((c) => createOnboardingChecklist(project.id, c));

    const [item] = await getOnboardingItems(project.id);
    await toggleOnboardingItem(item.id, true, user.id);
    await toggleOnboardingItem(item.id, false, user.id);

    const [after] = await getOnboardingItems(project.id);
    expect(after.completed).toBe(false);
    expect(after.completedAt).toBeNull();
    expect(after.completedBy).toBeNull();
  });

  it("devuelve false para un ítem inexistente", async () => {
    const user = await createTestUser();
    expect(await toggleOnboardingItem(999999, true, user.id)).toBe(false);
  });
});

describe("isOnboardingItemInProject", () => {
  it("distingue ítems de proyectos distintos", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const projectA = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    await withTransaction((c) => createOnboardingChecklist(projectA.id, c));

    const [item] = await getOnboardingItems(projectA.id);
    expect(await isOnboardingItemInProject(item.id, projectA.id)).toBe(true);
    expect(await isOnboardingItemInProject(item.id, projectB.id)).toBe(false);
  });
});

describe("integración con creación de proyectos", () => {
  it("aceptar una propuesta crea el checklist junto con el proyecto", async () => {
    const created = await createTestProposal({});
    const proposal = await getProposalById(created.id);
    const project = await withTransaction((c) => acceptProposalAndCreateProject(proposal!, c));

    const items = await getOnboardingItems(project.id);
    expect(items).toHaveLength(ONBOARDING_STEPS.length);
  });

  it("crear un proyecto a mano desde el dashboard también crea el checklist", async () => {
    const project = await withTransaction((c) =>
      createProjectWithClient({ client_name: "Cliente Manual", client_email: "manual@test.local", title: "Proyecto Manual" }, c)
    );

    const items = await getOnboardingItems(project.id);
    expect(items).toHaveLength(ONBOARDING_STEPS.length);
  });
});
