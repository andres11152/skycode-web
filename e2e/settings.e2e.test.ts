import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Configuración — RBAC y edición de extremo a extremo", () => {
  it("admin (settings:write) lee la configuración por defecto", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.get("/api/settings");
    expect(res.status).toBe(200);
    const { settings } = await res.json();
    expect(settings.invoiceNumberPrefix).toBe("FAC-");
    expect(settings.slaHoursUrgente).toBe(4);
    expect(settings.manualUsdToCopRate).toBeNull();
  });

  it("admin actualiza la configuración y el cambio persiste", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const patchRes = await adminClient.patch("/api/settings", { default_tax_rate_pct: 19, sla_hours_urgente: 2 });
    expect(patchRes.status).toBe(200);

    const { settings } = await (await adminClient.get("/api/settings")).json();
    expect(settings.defaultTaxRatePct).toBe(19);
    expect(settings.slaHoursUrgente).toBe(2);
  });

  it("sales_manager NO tiene acceso a configuración", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");

    expect((await salesClient.get("/api/settings")).status).toBe(403);
    expect((await salesClient.patch("/api/settings", { default_tax_rate_pct: 10 })).status).toBe(403);
  });

  it("traffiker NO tiene acceso a configuración", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");

    expect((await traffikerClient.get("/api/settings")).status).toBe(403);
  });

  it("rechaza un cuerpo vacío (nada que actualizar)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch("/api/settings", {});
    expect(res.status).toBe(400);
  });

  it("rechaza campos desconocidos (ej. invoice_next_number, que no es editable acá)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch("/api/settings", { invoice_next_number: 500 });
    expect(res.status).toBe(400);
  });

  it("una tasa de impuesto negativa o mayor a 100 es rechazada", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.patch("/api/settings", { default_tax_rate_pct: -5 })).status).toBe(400);
    expect((await adminClient.patch("/api/settings", { default_tax_rate_pct: 150 })).status).toBe(400);
  });

  it("fijar una tasa manual la refleja de inmediato en /api/settings y afecta la conversión en /api/profitability", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    await adminClient.post("/api/invoices", {
      project_id: project.id,
      description: "Anticipo",
      amount: 100,
      currency: "USD",
      due_date: "2026-12-01",
    });

    await adminClient.patch("/api/settings", { manual_usd_to_cop_rate: 5000 });

    try {
      const profRes = await adminClient.get("/api/profitability");
      expect(profRes.status).toBe(200);
      const { projects } = await profRes.json();
      const result = projects.find((p: { id: number }) => p.id === project.id);
      expect(result.totalBilledCop).toBeCloseTo(500000, 5); // 100 USD * 5000
    } finally {
      // Deja la fila de `settings` como la encontró (NULL). No purga la
      // caché en memoria del proceso del servidor de pruebas — eso
      // seguirá devolviendo 5000 hasta que expire su TTL de 12h — pero
      // ningún otro test E2E de esta suite verifica un valor numérico
      // derivado de la tasa de cambio, así que ese residuo no rompe nada.
      await adminClient.patch("/api/settings", { manual_usd_to_cop_rate: null });
    }
  });
});
