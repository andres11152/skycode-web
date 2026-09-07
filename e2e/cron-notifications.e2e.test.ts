import { beforeEach, describe, expect, it } from "vitest";
import { BASE_URL } from "./helpers/config";
import { query } from "../src/lib/db";
import { createTestClient, createTestInvoice, createTestProject, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

const CRON_SECRET = process.env.CRON_SECRET!;

describe("POST /api/cron/check-notifications", () => {
  it("sin el header x-cron-secret, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/check-notifications`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("con un secreto incorrecto, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/check-notifications`, {
      method: "POST",
      headers: { "x-cron-secret": "secreto-incorrecto" },
    });
    expect(res.status).toBe(401);
  });

  it("con el secreto correcto, procesa las tres categorías y responde 200 con los conteos", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, dueDate: "2020-01-01" });

    const res = await fetch(`${BASE_URL}/api/cron/check-notifications`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invoicesOverdue).toBe(1);
    expect(body.proposalsViewed).toBe(0);
    expect(body.slaWarnings).toBe(0);

    const row = await query(`SELECT overdue_notified_at FROM invoices;`);
    expect(row.rows[0].overdue_notified_at).not.toBeNull();
  });

  it("es idempotente: correrlo dos veces seguidas no vuelve a contar lo ya avisado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, dueDate: "2020-01-01" });

    const headers = { "x-cron-secret": CRON_SECRET };
    const first = await (await fetch(`${BASE_URL}/api/cron/check-notifications`, { method: "POST", headers })).json();
    const second = await (await fetch(`${BASE_URL}/api/cron/check-notifications`, { method: "POST", headers })).json();

    expect(first.invoicesOverdue).toBe(1);
    expect(second.invoicesOverdue).toBe(0);
  });
});
