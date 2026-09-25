import { beforeEach, describe, expect, it } from "vitest";
import { getClientActivityFeed } from "./clientActivity";
import { query } from "../db";
import {
  createTestClient,
  createTestProject,
  createTestSprint,
  createTestUser,
  createTestInvoice,
  createTestPayment,
  resetTestDb,
} from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getClientActivityFeed", () => {
  it("devuelve vacío si el cliente no tiene actividad", async () => {
    const client = await createTestClient();
    const events = await getClientActivityFeed(client.id);
    expect(events).toEqual([]);
  });

  it("agrega documentos, facturas y pagos de los proyectos del cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { title: "Proyecto Actividad" });
    const uploader = await createTestUser();
    await query(
      `INSERT INTO documents (project_id, original_filename, mime_type, size_bytes, storage_key, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6);`,
      [project.id, "contrato.pdf", "application/pdf", 1024, "abc-123.pdf", uploader.id]
    );
    const invoice = await createTestInvoice(project.id, { amount: 2000 });
    await createTestPayment(invoice.id, { amount: 500 });

    const events = await getClientActivityFeed(client.id);
    const types = events.map((e) => e.type).sort();
    expect(types).toEqual(["document", "invoice", "payment"]);

    const documentEvent = events.find((e) => e.type === "document");
    expect(documentEvent?.label).toBe("contrato.pdf");
    expect(documentEvent?.projectTitle).toBe("Proyecto Actividad");

    const paymentEvent = events.find((e) => e.type === "payment");
    expect(paymentEvent?.amount).toBe(500);
  });

  it("no incluye documentos/facturas borrados lógicamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await query(
      `INSERT INTO documents (project_id, original_filename, mime_type, size_bytes, storage_key, deleted_at)
       VALUES ($1,$2,$3,$4,$5, now());`,
      [project.id, "borrado.pdf", "application/pdf", 1, "borrado.pdf"]
    );
    await createTestInvoice(project.id, { deletedAt: new Date() });

    const events = await getClientActivityFeed(client.id);
    expect(events).toEqual([]);
  });

  it("agrega tickets de soporte creados y resueltos", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await query(
      `INSERT INTO support_tickets (project_id, title, priority, status, sla_due_at, resolved_at)
       VALUES ($1,$2,'Media','Resuelto', now() + interval '1 day', now());`,
      [project.id, "Ticket resuelto de prueba"]
    );

    const events = await getClientActivityFeed(client.id);
    const types = events.map((e) => e.type).sort();
    expect(types).toEqual(["ticket_created", "ticket_resolved"]);
  });

  it("agrega aprobaciones de sprint (aprobado/rechazado)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id, { title: "Sprint 1", status: "Completado" });
    await query(`UPDATE sprints SET approval_status = 'rechazado', approved_at = now() WHERE id = $1;`, [sprint.id]);

    const events = await getClientActivityFeed(client.id);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("sprint_approval");
    expect(events[0].status).toBe("rechazado");
  });

  it("agrega comentarios de sprint del equipo, pero excluye los del propio cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id, { title: "Sprint con comentarios" });
    const teamUser = await createTestUser({ role: "admin" });
    const clientUser = await createTestUser({ role: "client", clientId: client.id });

    await query(`INSERT INTO sprint_comments (sprint_id, author_id, body) VALUES ($1,$2,$3);`, [
      sprint.id,
      teamUser.id,
      "Comentario del equipo",
    ]);
    await query(`INSERT INTO sprint_comments (sprint_id, author_id, body) VALUES ($1,$2,$3);`, [
      sprint.id,
      clientUser.id,
      "Comentario del propio cliente",
    ]);

    const events = await getClientActivityFeed(client.id);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("sprint_comment");
  });

  it("no incluye actividad de otro cliente", async () => {
    const client = await createTestClient();
    const otherClient = await createTestClient();
    const otherProject = await createTestProject(otherClient.id);
    await createTestInvoice(otherProject.id);

    const events = await getClientActivityFeed(client.id);
    expect(events).toEqual([]);
  });

  it("respeta el límite y ordena por fecha descendente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    for (let i = 0; i < 3; i++) {
      await createTestInvoice(project.id, { description: `Factura ${i}` });
    }

    const events = await getClientActivityFeed(client.id, 2);
    expect(events).toHaveLength(2);
  });
});
