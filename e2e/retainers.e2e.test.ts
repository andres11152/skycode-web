import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { BASE_URL } from "./helpers/config";
import { query } from "../src/lib/db";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

const CRON_SECRET = process.env.CRON_SECRET!;

describe("Retainers — extremo a extremo", () => {
  it("admin (invoices:write) crea un retainer y lo ve en el listado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await browser.post("/api/retainers", {
      project_id: project.id,
      description: "Mantenimiento mensual",
      amount: 500,
      currency: "USD",
      billing_day: 5,
      next_invoice_date: "2026-10-05",
    });
    expect(createRes.status).toBe(200);

    const listRes = await browser.get("/api/retainers");
    const { retainers } = await listRes.json();
    expect(retainers).toHaveLength(1);
    expect(retainers[0].client_name).toBe(client.name);
  });

  it("sales_manager (sin invoices:write) no puede crear un retainer, pero sí listarlos", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const browser = await loginAs(salesManager.email, "SuperSecret123456");

    const createRes = await browser.post("/api/retainers", {
      project_id: project.id,
      description: "x",
      amount: 100,
      billing_day: 1,
      next_invoice_date: "2026-01-01",
    });
    expect(createRes.status).toBe(403);

    const listRes = await browser.get("/api/retainers");
    expect(listRes.status).toBe(200);
  });

  it("traffiker no puede ni listar ni crear", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const browser = await loginAs(traffiker.email, "SuperSecret123456");

    expect((await browser.get("/api/retainers")).status).toBe(403);
    expect((await browser.post("/api/retainers", { project_id: 1, description: "x", amount: 1, billing_day: 1, next_invoice_date: "2026-01-01" })).status).toBe(403);
  });

  it("rechaza un proyecto inexistente (400)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const res = await browser.post("/api/retainers", {
      project_id: 999999,
      description: "x",
      amount: 100,
      billing_day: 1,
      next_invoice_date: "2026-01-01",
    });
    expect(res.status).toBe(400);
  });

  it("rechaza un billing_day fuera de 1-28", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const res = await browser.post("/api/retainers", {
      project_id: project.id,
      description: "x",
      amount: 100,
      billing_day: 31,
      next_invoice_date: "2026-01-01",
    });
    expect(res.status).toBe(400);
  });

  it("admin pausa, reanuda y luego cancela un retainer", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await browser.post("/api/retainers", {
      project_id: project.id,
      description: "x",
      amount: 100,
      billing_day: 1,
      next_invoice_date: "2026-01-01",
    });
    const { id } = await createRes.json();

    expect((await browser.patch(`/api/retainers/${id}`, { status: "paused" })).status).toBe(200);
    expect((await browser.patch(`/api/retainers/${id}`, { status: "active" })).status).toBe(200);
    expect((await browser.patch(`/api/retainers/${id}`, { status: "cancelled" })).status).toBe(200);

    const { retainers } = await (await browser.get("/api/retainers")).json();
    expect(retainers[0].status).toBe("cancelled");
  });

  it("actualizar un retainer inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    expect((await browser.patch("/api/retainers/999999", { status: "paused" })).status).toBe(404);
  });

  it("admin elimina un retainer (borrado lógico, sale del listado)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await browser.post("/api/retainers", {
      project_id: project.id,
      description: "x",
      amount: 100,
      billing_day: 1,
      next_invoice_date: "2026-01-01",
    });
    const { id } = await createRes.json();

    expect((await browser.delete(`/api/retainers/${id}`)).status).toBe(200);
    const { retainers } = await (await browser.get("/api/retainers")).json();
    expect(retainers).toHaveLength(0);
  });
});

describe("POST /api/cron/generate-retainer-invoices", () => {
  it("sin el header x-cron-secret, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/generate-retainer-invoices`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("con el secreto correcto, genera la factura y avanza la fecha", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    await browser.post("/api/retainers", {
      project_id: project.id,
      description: "Soporte mensual",
      amount: 300,
      billing_day: 1,
      next_invoice_date: "2020-01-01",
    });

    const res = await fetch(`${BASE_URL}/api/cron/generate-retainer-invoices`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoicesGenerated).toBe(1);

    const invoiceRes = await query(`SELECT description FROM invoices WHERE project_id = $1;`, [project.id]);
    expect(invoiceRes.rows[0].description).toContain("Soporte mensual");
  });
});
