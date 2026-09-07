import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Tickets de soporte — RBAC de extremo a extremo", () => {
  it("admin (support:write) crea un ticket y lo edita (prioridad, estado, nota)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/support-tickets", {
      project_id: project.id,
      title: "Timeout en la API de pagos",
      priority: "Alta",
    });
    expect(createRes.status).toBe(200);
    const { ticket } = await createRes.json();
    expect(ticket.status).toBe("Abierto");
    expect(ticket.sla_due_at).toBeTruthy();

    const patchRes = await adminClient.patch(`/api/support-tickets/${ticket.id}`, {
      status: "Resuelto",
      resolution_note: "Se aumentó el timeout del proveedor de pagos.",
    });
    expect(patchRes.status).toBe(200);
    const { ticket: updated } = await patchRes.json();
    expect(updated.status).toBe("Resuelto");
    expect(updated.resolved_at).toBeTruthy();
  });

  it("traffiker (sin support:write) no puede crear tickets", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await traffikerClient.post("/api/support-tickets", { project_id: project.id, title: "No debería crear esto" });
    expect(res.status).toBe(403);
  });

  it("traffiker (sin support:read) no puede listar tickets", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await traffikerClient.get("/api/support-tickets");
    expect(res.status).toBe(403);
  });

  it("un cliente de portal ve solo los tickets de sus propios proyectos, no el tablero interno completo (ver e2e/portal.e2e.test.ts para el aislamiento entre clientes)", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const clientBrowser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await clientBrowser.get("/api/support-tickets");
    expect(res.status).toBe(200);
    const { tickets } = await res.json();
    expect(tickets).toEqual([]);
  });

  it("sales_manager (support:write) puede editar un ticket creado por admin", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/support-tickets", { project_id: project.id, title: "T" });
    const { ticket } = await createRes.json();

    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");
    const res = await salesClient.patch(`/api/support-tickets/${ticket.id}`, { status: "En Progreso" });
    expect(res.status).toBe(200);
  });

  it("un ticket que no existe da 404 al intentar editarlo", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch("/api/support-tickets/999999", { status: "Cerrado" });
    expect(res.status).toBe(404);
  });
});
