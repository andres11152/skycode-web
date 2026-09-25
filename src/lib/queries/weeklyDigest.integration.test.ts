import { beforeEach, describe, expect, it } from "vitest";
import { getWeeklyDigestStats, sendWeeklyDigest } from "./weeklyDigest";
import { query, withTransaction } from "../db";
import { createTicket } from "./supportTickets";
import { createInvoice } from "./invoices";
import {
  createTestClient,
  createTestLead,
  createTestProject,
  createTestProposal,
  createTestUser,
  resetTestDb,
} from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getWeeklyDigestStats", () => {
  it("cuenta leads creados en los últimos 7 días, ignora los más viejos", async () => {
    await createTestLead();
    const old = await createTestLead();
    await query(`UPDATE leads SET created_at = now() - interval '10 days' WHERE id = $1;`, [old.id]);

    const stats = await getWeeklyDigestStats();
    expect(stats.newLeads).toBe(1);
  });

  it("ignora leads borrados lógicamente", async () => {
    await createTestLead({ deletedAt: new Date() });
    const stats = await getWeeklyDigestStats();
    expect(stats.newLeads).toBe(0);
  });

  it("cuenta propuestas pendientes (sin aceptar/rechazar, sin vencer) y excluye las cerradas", async () => {
    await createTestProposal({});
    await createTestProposal({ acceptedAt: new Date() });
    await createTestProposal({ rejectedAt: new Date() });
    await createTestProposal({ validUntil: "2020-01-01" });

    const stats = await getWeeklyDigestStats();
    expect(stats.pendingProposals).toBe(1);
  });

  it("cuenta facturas vencidas con saldo pendiente, ignora las pagadas por completo", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    await withTransaction((c) =>
      createInvoice({ project_id: project.id, description: "Vencida", amount: 1000, due_date: "2020-01-01" }, user.id, c)
    );

    const stats = await getWeeklyDigestStats();
    expect(stats.overdueInvoices).toBe(1);
  });

  it("cuenta tickets abiertos con SLA vencido o por vencer en 48h, ignora los resueltos", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    const atRiskId = await withTransaction((c) => createTicket({ project_id: project.id, title: "En riesgo" }, user.id, c));
    await query(`UPDATE support_tickets SET sla_due_at = now() + interval '10 hours' WHERE id = $1;`, [atRiskId]);

    const resolvedId = await withTransaction((c) => createTicket({ project_id: project.id, title: "Resuelto" }, user.id, c));
    await query(
      `UPDATE support_tickets SET sla_due_at = now() - interval '1 hour', status = 'Resuelto' WHERE id = $1;`,
      [resolvedId]
    );

    const farId = await withTransaction((c) => createTicket({ project_id: project.id, title: "Lejano" }, user.id, c));
    await query(`UPDATE support_tickets SET sla_due_at = now() + interval '5 days' WHERE id = $1;`, [farId]);

    const stats = await getWeeklyDigestStats();
    expect(stats.slaAtRisk).toBe(1);
  });
});

describe("sendWeeklyDigest", () => {
  it("intenta enviar solo a usuarios activos admin/sales_manager, no a traffiker ni client", async () => {
    await createTestUser({ role: "admin" });
    await createTestUser({ role: "sales_manager" });
    await createTestUser({ role: "traffiker" });
    const client = await createTestClient();
    await createTestUser({ role: "client", clientId: client.id });

    const recipientCount = await sendWeeklyDigest();
    expect(recipientCount).toBe(2);
  });

  it("no cuenta usuarios inactivos", async () => {
    await createTestUser({ role: "admin", status: "disabled" });
    await createTestUser({ role: "sales_manager" });

    const recipientCount = await sendWeeklyDigest();
    expect(recipientCount).toBe(1);
  });
});
