import { beforeEach, describe, expect, it } from "vitest";
import { notifyViewedProposals, notifyOverdueInvoices, notifySlaWarnings } from "./notifications";
import { query, withTransaction } from "../db";
import { createTicket } from "./supportTickets";
import { createInvoice } from "./invoices";
import {
  createTestClient,
  createTestInvoice,
  createTestPayment,
  createTestProject,
  createTestProposal,
  createTestUser,
  resetTestDb,
} from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("notifyViewedProposals", () => {
  it("marca como avisada una propuesta vista y no avisada, devuelve el conteo", async () => {
    const user = await createTestUser();
    const proposal = await createTestProposal({ createdBy: user.id });
    await query(`UPDATE proposals SET viewed_at = now() WHERE id = $1;`, [proposal.id]);

    const count = await notifyViewedProposals();
    expect(count).toBe(1);

    const row = await query(`SELECT viewed_notified_at FROM proposals WHERE id = $1;`, [proposal.id]);
    expect(row.rows[0].viewed_notified_at).not.toBeNull();
  });

  it("no reprocesa una propuesta ya avisada (idempotente entre corridas)", async () => {
    const user = await createTestUser();
    const proposal = await createTestProposal({ createdBy: user.id });
    await query(`UPDATE proposals SET viewed_at = now() WHERE id = $1;`, [proposal.id]);

    await notifyViewedProposals();
    const second = await notifyViewedProposals();
    expect(second).toBe(0);
  });

  it("ignora propuestas no vistas todavía", async () => {
    const user = await createTestUser();
    await createTestProposal({ createdBy: user.id });

    const count = await notifyViewedProposals();
    expect(count).toBe(0);
  });

  it("una propuesta vista sin creador (created_by null) igual se marca, sin fallar", async () => {
    const proposal = await createTestProposal({});
    await query(`UPDATE proposals SET viewed_at = now(), created_by = NULL WHERE id = $1;`, [proposal.id]);

    const count = await notifyViewedProposals();
    expect(count).toBe(1);
    const row = await query(`SELECT viewed_notified_at FROM proposals WHERE id = $1;`, [proposal.id]);
    expect(row.rows[0].viewed_notified_at).not.toBeNull();
  });
});

describe("notifyOverdueInvoices", () => {
  it("marca como avisada una factura vencida con saldo pendiente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const invoice = await withTransaction((c) =>
      createInvoice({ project_id: project.id, description: "Vencida", amount: 1000, due_date: "2020-01-01" }, user.id, c)
    );

    const count = await notifyOverdueInvoices();
    expect(count).toBe(1);

    const row = await query(`SELECT overdue_notified_at FROM invoices WHERE id = $1;`, [invoice!.id]);
    expect(row.rows[0].overdue_notified_at).not.toBeNull();
  });

  it("una factura vencida pero completamente pagada NO genera aviso", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, dueDate: "2020-01-01" });
    await createTestPayment(invoice.id, { amount: 1000 });

    const count = await notifyOverdueInvoices();
    expect(count).toBe(0);
  });

  it("una factura con vencimiento futuro NO genera aviso", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, dueDate: "2099-01-01" });

    const count = await notifyOverdueInvoices();
    expect(count).toBe(0);
  });

  it("no reprocesa una factura ya avisada", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, dueDate: "2020-01-01" });

    await notifyOverdueInvoices();
    const second = await notifyOverdueInvoices();
    expect(second).toBe(0);
  });
});

describe("notifySlaWarnings", () => {
  it("marca como avisado un ticket abierto cuyo SLA ya venció", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await withTransaction((c) => createTicket({ project_id: project.id, title: "Urgente" }, user.id, c));
    await query(`UPDATE support_tickets SET sla_due_at = now() - interval '1 hour' WHERE id = $1;`, [ticketId]);

    const count = await notifySlaWarnings();
    expect(count).toBe(1);

    const row = await query(`SELECT sla_warning_notified_at FROM support_tickets WHERE id = $1;`, [ticketId]);
    expect(row.rows[0].sla_warning_notified_at).not.toBeNull();
  });

  it("un ticket ya resuelto NO genera aviso aunque su SLA esté vencido", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await withTransaction((c) => createTicket({ project_id: project.id, title: "Resuelto" }, user.id, c));
    await query(
      `UPDATE support_tickets SET sla_due_at = now() - interval '1 hour', status = 'Resuelto' WHERE id = $1;`,
      [ticketId]
    );

    const count = await notifySlaWarnings();
    expect(count).toBe(0);
  });

  it("un ticket con SLA lejano (fuera de la ventana de aviso) NO genera aviso", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await withTransaction((c) => createTicket({ project_id: project.id, title: "Lejano" }, user.id, c));
    await query(`UPDATE support_tickets SET sla_due_at = now() + interval '48 hours' WHERE id = $1;`, [ticketId]);

    const count = await notifySlaWarnings();
    expect(count).toBe(0);
  });

  it("no reprocesa un ticket ya avisado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await withTransaction((c) => createTicket({ project_id: project.id, title: "Urgente" }, user.id, c));
    await query(`UPDATE support_tickets SET sla_due_at = now() - interval '1 hour' WHERE id = $1;`, [ticketId]);

    await notifySlaWarnings();
    const second = await notifySlaWarnings();
    expect(second).toBe(0);
  });
});
