import { beforeEach, describe, expect, it } from "vitest";
import { getCampaignProfitability, getProjectProfitability } from "./profitability";
import { query } from "../db";
import {
  createTestCampaign,
  createTestCampaignSpend,
  createTestClient,
  createTestExpense,
  createTestInvoice,
  createTestLead,
  createTestProject,
  createTestProposal,
  createTestTimeEntry,
  createTestUser,
  resetTestDb,
} from "../testHelpers/db";

// Tasa de prueba fija — nunca se llama a getUsdToCopRate() (ni a la red)
// porque siempre se pasa `prefetchedRate` explícito.
const RATE = 4000;

beforeEach(async () => {
  await resetTestDb();
});

describe("getProjectProfitability", () => {
  it("un proyecto sin propuesta aceptada, horas ni facturas: todo en cero/null, sin dividir por cero", async () => {
    const client = await createTestClient();
    await createTestProject(client.id);

    const [result] = await getProjectProfitability(RATE);
    expect(result.quotedAmountOriginal).toBeNull();
    expect(result.quotedCurrencyOriginal).toBeNull();
    expect(result.quotedAmountCop).toBeNull();
    expect(result.totalHours).toBe(0);
    expect(result.totalCostCop).toBe(0);
    expect(result.totalExpensesCop).toBe(0);
    expect(result.totalBilledCop).toBe(0);
    expect(result.marginVsBilledCop).toBe(0);
    expect(result.marginVsQuotedCop).toBeNull();
    expect(result.deviationPct).toBeNull();
  });

  it(
    "regresión del bug real: agrega correctamente costo de horas y facturación cuando " +
      "mezclan COP y USD, convirtiendo todo a COP con la tasa antes de sumar (no como enteros)",
    async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);

      // Propuesta aceptada cotizada en USD: 100 USD subtotal + 10% impuesto = 110 USD.
      await createTestProposal({
        acceptedProjectId: project.id,
        currency: "USD",
        taxRate: 10,
        items: [{ description: "Desarrollo", quantity: 1, unitPrice: 100 }],
      });

      // Costo de horas: un empleado cobrado en USD, otro en COP.
      const userUsd = await createTestUser({ hourlyCost: 10, hourlyCostCurrency: "USD" });
      const userCop = await createTestUser({ hourlyCost: 20000, hourlyCostCurrency: "COP" });
      await createTestTimeEntry(userUsd.id, project.id, { hours: 5 }); // 50 USD -> 200000 COP
      await createTestTimeEntry(userCop.id, project.id, { hours: 2 }); // 40000 COP

      // Facturación: una factura en USD, otra en COP.
      await createTestInvoice(project.id, { amount: 50, currency: "USD" }); // -> 200000 COP
      await createTestInvoice(project.id, { amount: 100000, currency: "COP" });

      const [result] = await getProjectProfitability(RATE);

      expect(result.quotedCurrencyOriginal).toBe("USD");
      expect(result.quotedAmountOriginal).toBeCloseTo(110, 5);
      expect(result.quotedAmountCop).toBeCloseTo(440000, 5); // 110 * 4000

      expect(result.totalHours).toBe(7);
      expect(result.totalCostCop).toBeCloseTo(240000, 5); // 200000 + 40000
      expect(result.totalExpensesCop).toBe(0);

      expect(result.totalBilledCop).toBeCloseTo(300000, 5); // 200000 + 100000

      expect(result.marginVsBilledCop).toBeCloseTo(60000, 5); // 300000 - 240000
      expect(result.marginVsQuotedCop).toBeCloseTo(200000, 5); // 440000 - 240000
      expect(result.deviationPct).toBeCloseTo(((240000 - 440000) / 440000) * 100, 5);
    }
  );

  it("una tasa de cambio con decimales no redondos no revienta la conversión SQL (bug real ya corregido)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 50, currency: "USD" });

    const realisticRate = 3198.300858;
    const [result] = await getProjectProfitability(realisticRate);

    expect(result.totalBilledCop).toBeCloseTo(50 * realisticRate, 4);
  });

  it("solo cuenta horas y facturas del proyecto correspondiente, no de otros", async () => {
    const client = await createTestClient();
    const projectA = await createTestProject(client.id, { title: "A" });
    const projectB = await createTestProject(client.id, { title: "B" });
    const user = await createTestUser({ hourlyCost: 10000, hourlyCostCurrency: "COP" });

    await createTestTimeEntry(user.id, projectA.id, { hours: 3 });
    await createTestTimeEntry(user.id, projectB.id, { hours: 1 });
    await createTestInvoice(projectA.id, { amount: 1000, currency: "COP" });

    const results = await getProjectProfitability(RATE);
    const a = results.find((r) => r.title === "A");
    const b = results.find((r) => r.title === "B");

    expect(a?.totalHours).toBe(3);
    expect(b?.totalHours).toBe(1);
    expect(a?.totalBilledCop).toBe(1000);
    expect(b?.totalBilledCop).toBe(0);
  });

  it("excluye proyectos borrados lógicamente", async () => {
    const client = await createTestClient();
    await createTestProject(client.id, { title: "Visible" });
    const deleted = await createTestProject(client.id, { title: "Eliminado" });
    await query(`UPDATE projects SET deleted_at = now() WHERE id = $1;`, [deleted.id]);

    const results = await getProjectProfitability(RATE);
    expect(results.map((r) => r.title)).toEqual(["Visible"]);
  });

  it("resta los gastos del proyecto (convertidos a COP) del margen — cierra el cálculo de margen real", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const otherProject = await createTestProject(client.id);

    await createTestInvoice(project.id, { amount: 500000, currency: "COP" });
    await createTestExpense({ projectId: project.id, amount: 50, currency: "USD" }); // -> 200000 COP
    await createTestExpense({ projectId: project.id, amount: 30000, currency: "COP" });
    // Gasto de otro proyecto: no debe afectar el margen de `project`.
    await createTestExpense({ projectId: otherProject.id, amount: 999999, currency: "COP" });
    // Gasto general sin proyecto (overhead): tampoco debe afectar ningún margen por proyecto.
    await createTestExpense({ projectId: null, amount: 999999, currency: "COP" });

    const results = await getProjectProfitability(RATE);
    const result = results.find((r) => r.id === project.id)!;

    expect(result.totalExpensesCop).toBeCloseTo(230000, 5); // 200000 + 30000
    expect(result.totalCostCop).toBe(0); // sin horas registradas
    expect(result.totalBilledCop).toBeCloseTo(500000, 5);
    expect(result.marginVsBilledCop).toBeCloseTo(270000, 5); // 500000 - 0 - 230000
  });
});

describe("getCampaignProfitability", () => {
  it("una campaña sin gasto, leads ni proyectos atribuidos: todo en cero, roi null", async () => {
    await createTestCampaign({ name: "Vacía" });

    const [result] = await getCampaignProfitability(RATE);
    expect(result.totalSpendCop).toBe(0);
    expect(result.totalBilledCop).toBe(0);
    expect(result.totalCostCop).toBe(0);
    expect(result.netMarginCop).toBe(0);
    expect(result.roi).toBeNull();
  });

  it(
    "cierra el circuito campaña -> lead -> cliente -> proyecto, convirtiendo gasto en USD " +
      "a COP antes de calcular el margen neto y el ROI",
    async () => {
      const campaign = await createTestCampaign({ name: "Google Ads" });
      await createTestCampaignSpend(campaign.id, { amount: 25, currency: "USD" }); // -> 100000 COP

      const client = await createTestClient({ email: "prospecto@example.com" });
      await createTestLead({ campaignId: campaign.id, email: "prospecto@example.com" });

      const project = await createTestProject(client.id);
      await createTestInvoice(project.id, { amount: 50000, currency: "COP" });
      await createTestInvoice(project.id, { amount: 10, currency: "USD" }); // -> 40000 COP

      const user = await createTestUser({ hourlyCost: 10000, hourlyCostCurrency: "COP" });
      await createTestTimeEntry(user.id, project.id, { hours: 2 }); // 20000 COP

      const [result] = await getCampaignProfitability(RATE);

      expect(result.totalSpendCop).toBeCloseTo(100000, 5);
      expect(result.totalBilledCop).toBeCloseTo(90000, 5); // 50000 + 40000
      expect(result.totalCostCop).toBeCloseTo(20000, 5);
      expect(result.netMarginCop).toBeCloseTo(-30000, 5); // 90000 - 20000 - 100000
      expect(result.roi).toBeCloseTo(-30000 / 100000, 5);
    }
  );

  it("un lead sin cliente coincidente (email no registrado) no atribuye facturación a la campaña", async () => {
    const campaign = await createTestCampaign();
    await createTestCampaignSpend(campaign.id, { amount: 100, currency: "COP" });
    await createTestLead({ campaignId: campaign.id, email: "nadie@nowhere.local" });

    const [result] = await getCampaignProfitability(RATE);
    expect(result.totalBilledCop).toBe(0);
    expect(result.totalSpendCop).toBe(100);
  });

  it("excluye campañas borradas lógicamente", async () => {
    await createTestCampaign({ name: "Activa" });
    await createTestCampaign({ name: "Eliminada", deletedAt: new Date() });

    const results = await getCampaignProfitability(RATE);
    expect(results.map((r) => r.name)).toEqual(["Activa"]);
  });
});
