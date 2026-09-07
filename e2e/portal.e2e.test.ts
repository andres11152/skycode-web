import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import {
  createTestClient,
  createTestInvoice,
  createTestProject,
  createTestSprint,
  createTestUser,
  resetTestDb,
} from "../src/lib/testHelpers/db";
import { withTransaction } from "../src/lib/db";
import { createDocumentRecord } from "../src/lib/queries/documents";
import { saveDocumentFile } from "../src/lib/storage";

beforeEach(async () => {
  await resetTestDb();
});

describe("Portal ampliado — Facturas (solo lectura)", () => {
  it("un cliente ve solo sus propias facturas, no las de otro cliente", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const projectA = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    await createTestInvoice(projectA.id, { description: "Factura A" });
    await createTestInvoice(projectB.id, { description: "Factura B" });

    const userA = await createTestUser({ role: "client", clientId: clientA.id, password: "SuperSecret123456" });
    const browserA = await loginAs(userA.email, "SuperSecret123456");

    const res = await browserA.get("/api/invoices");
    expect(res.status).toBe(200);
    const { invoices } = await res.json();
    expect(invoices.map((i: { description: string }) => i.description)).toEqual(["Factura A"]);
  });

  it("admin sigue viendo todas las facturas (no se rompió con el filtro de cliente)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.get("/api/invoices");
    expect(res.status).toBe(200);
    const { invoices } = await res.json();
    expect(invoices).toHaveLength(1);
  });

  it("un cliente no puede crear ni pagar facturas (solo lectura)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.post("/api/invoices", {
      project_id: project.id,
      description: "Intento",
      amount: 100,
      due_date: "2026-12-01",
    });
    expect(res.status).toBe(403);
  });
});

describe("Portal ampliado — Documentos (solo descarga)", () => {
  it("un cliente ve documentos de TODOS sus proyectos, aislado de otro cliente", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const projectA = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    const uploader = await createTestUser();

    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: projectA.id, original_filename: "a.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "a.pdf" },
        uploader.id,
        c
      )
    );
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: projectB.id, original_filename: "b.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "b.pdf" },
        uploader.id,
        c
      )
    );

    const userA = await createTestUser({ role: "client", clientId: clientA.id, password: "SuperSecret123456" });
    const browserA = await loginAs(userA.email, "SuperSecret123456");

    const res = await browserA.get("/api/documents");
    expect(res.status).toBe(200);
    const { documents } = await res.json();
    expect(documents.map((d: { original_filename: string }) => d.original_filename)).toEqual(["a.pdf"]);
  });

  it("con projectId explícito, un cliente sigue recibiendo 403 (esa forma es exclusiva del panel interno)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.get(`/api/documents?projectId=${project.id}`);
    expect(res.status).toBe(403);
  });

  it("un cliente puede descargar un documento propio, pero no uno de otro cliente", async () => {
    const owner = await createTestClient();
    const attacker = await createTestClient();
    const project = await createTestProject(owner.id);
    const uploader = await createTestUser();

    const storageKey = await saveDocumentFile(Buffer.from("contenido de prueba"), "contrato.pdf");
    const docId = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "contrato.pdf", mime_type: "application/pdf", size_bytes: 19, storage_key: storageKey },
        uploader.id,
        c
      )
    );

    const ownerUser = await createTestUser({ role: "client", clientId: owner.id, password: "SuperSecret123456" });
    const attackerUser = await createTestUser({ role: "client", clientId: attacker.id, password: "SuperSecret123456" });
    const ownerBrowser = await loginAs(ownerUser.email, "SuperSecret123456");
    const attackerBrowser = await loginAs(attackerUser.email, "SuperSecret123456");

    expect((await attackerBrowser.get(`/api/documents/${docId}/download`)).status).toBe(403);
    expect((await ownerBrowser.get(`/api/documents/${docId}/download`)).status).toBe(200);
  });
});

describe("Portal ampliado — Soporte (abrir incidencias)", () => {
  it("un cliente abre un ticket contra su propio proyecto, forzado a prioridad Media y sin responsable", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.post("/api/support-tickets", { project_id: project.id, title: "No carga el checkout" });
    expect(res.status).toBe(200);
    const { ticket } = await res.json();
    expect(ticket.priority).toBe("Media");
    expect(ticket.assignee).toBeNull();
  });

  it("un cliente no puede abrir un ticket contra el proyecto de otro cliente", async () => {
    const owner = await createTestClient();
    const attacker = await createTestClient();
    const project = await createTestProject(owner.id);
    const attackerUser = await createTestUser({ role: "client", clientId: attacker.id, password: "SuperSecret123456" });
    const browser = await loginAs(attackerUser.email, "SuperSecret123456");

    const res = await browser.post("/api/support-tickets", { project_id: project.id, title: "Intento" });
    expect(res.status).toBe(404);
  });

  it("un cliente que manda priority/assignee_id recibe 400 (esos campos no son suyos para decidir)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.post("/api/support-tickets", { project_id: project.id, title: "X", priority: "Urgente" });
    expect(res.status).toBe(400);
  });

  it("un cliente ve solo sus propios tickets", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const projectA = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    await adminClient.post("/api/support-tickets", { project_id: projectA.id, title: "Ticket A" });
    await adminClient.post("/api/support-tickets", { project_id: projectB.id, title: "Ticket B" });

    const userA = await createTestUser({ role: "client", clientId: clientA.id, password: "SuperSecret123456" });
    const browserA = await loginAs(userA.email, "SuperSecret123456");

    const res = await browserA.get("/api/support-tickets");
    const { tickets } = await res.json();
    expect(tickets.map((t: { title: string }) => t.title)).toEqual(["Ticket A"]);
  });

  it("admin sigue pudiendo crear tickets con prioridad y responsable elegidos (no se rompió el camino interno)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/support-tickets", { project_id: project.id, title: "X", priority: "Urgente" });
    expect(res.status).toBe(200);
    const { ticket } = await res.json();
    expect(ticket.priority).toBe("Urgente");
  });
});

describe("Portal ampliado — Aprobar/rechazar entregables", () => {
  it("el cliente dueño aprueba un sprint completado, con comentario", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id, { status: "Completado" });
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.patch(`/api/sprints/${sprint.id}/approval`, { status: "aprobado", comment: "Excelente" });
    expect(res.status).toBe(200);
    const { sprint: updated } = await res.json();
    expect(updated.approval_status).toBe("aprobado");
    expect(updated.approval_comment).toBe("Excelente");
  });

  it("no se puede aprobar un sprint que no está Completado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id, { status: "En Progreso" });
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.patch(`/api/sprints/${sprint.id}/approval`, { status: "aprobado" });
    expect(res.status).toBe(400);
  });

  it("no se puede aprobar/rechazar dos veces (409 en el segundo intento)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id, { status: "Completado" });
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    await browser.patch(`/api/sprints/${sprint.id}/approval`, { status: "aprobado" });
    const second = await browser.patch(`/api/sprints/${sprint.id}/approval`, { status: "rechazado" });
    expect(second.status).toBe(409);
  });

  it("un cliente no puede aprobar el sprint de otro cliente (404, no revela que existe)", async () => {
    const owner = await createTestClient();
    const attacker = await createTestClient();
    const project = await createTestProject(owner.id);
    const sprint = await createTestSprint(project.id, { status: "Completado" });
    const attackerUser = await createTestUser({ role: "client", clientId: attacker.id, password: "SuperSecret123456" });
    const browser = await loginAs(attackerUser.email, "SuperSecret123456");

    const res = await browser.patch(`/api/sprints/${sprint.id}/approval`, { status: "aprobado" });
    expect(res.status).toBe(404);
  });

  it("un admin no puede usar esta ruta — aprobar es exclusivo del cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id, { status: "Completado" });
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch(`/api/sprints/${sprint.id}/approval`, { status: "aprobado" });
    expect(res.status).toBe(403);
  });

  it("un sprint inexistente da 404", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.patch(`/api/sprints/999999/approval`, { status: "aprobado" });
    expect(res.status).toBe(404);
  });
});
