import { beforeEach, describe, expect, it } from "vitest";
import { getCampaignSpend, getCampaignsWithMetrics } from "./campaigns";
import { createTestCampaign, createTestCampaignSpend, createTestLead, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getCampaignsWithMetrics", () => {
  it("una campaña sin gasto ni leads: cpl y conversionRate son null, no división por cero", async () => {
    await createTestCampaign({ name: "Vacía" });

    const [campaign] = await getCampaignsWithMetrics();
    expect(campaign.totalSpend).toBe(0);
    expect(campaign.leadCount).toBe(0);
    expect(campaign.cpl).toBeNull();
    expect(campaign.conversionRate).toBeNull();
  });

  it("calcula CPL y tasa de conversión a partir del gasto y los leads atribuidos", async () => {
    const campaign = await createTestCampaign({ name: "Con métricas" });
    await createTestCampaignSpend(campaign.id, { amount: 100 });
    await createTestCampaignSpend(campaign.id, { amount: 100, spendDate: "2026-01-02" });
    await createTestLead({ campaignId: campaign.id, status: "Nuevo" });
    await createTestLead({ campaignId: campaign.id, status: "Ganado" });

    const [result] = await getCampaignsWithMetrics();
    expect(result.totalSpend).toBe(200);
    expect(result.leadCount).toBe(2);
    expect(result.wonCount).toBe(1);
    expect(result.cpl).toBe(100); // 200 / 2
    expect(result.conversionRate).toBe(0.5); // 1 / 2
  });

  it("no cuenta leads borrados lógicamente ni leads de otra campaña", async () => {
    const campaign = await createTestCampaign({ name: "A" });
    const other = await createTestCampaign({ name: "B" });
    await createTestLead({ campaignId: campaign.id, status: "Nuevo" });
    await createTestLead({ campaignId: campaign.id, status: "Nuevo", deletedAt: new Date() });
    await createTestLead({ campaignId: other.id, status: "Nuevo" });

    const results = await getCampaignsWithMetrics();
    const found = results.find((c) => c.name === "A");
    expect(found?.leadCount).toBe(1);
  });

  it("overBudget es true cuando el gasto total supera el presupuesto", async () => {
    const overBudget = await createTestCampaign({ name: "Sobre presupuesto", budget: 50 });
    await createTestCampaignSpend(overBudget.id, { amount: 100 });

    const underBudget = await createTestCampaign({ name: "Bajo presupuesto", budget: 500 });
    await createTestCampaignSpend(underBudget.id, { amount: 100 });

    const noBudget = await createTestCampaign({ name: "Sin presupuesto definido", budget: null });
    await createTestCampaignSpend(noBudget.id, { amount: 100 });

    const results = await getCampaignsWithMetrics();
    expect(results.find((c) => c.name === "Sobre presupuesto")?.overBudget).toBe(true);
    expect(results.find((c) => c.name === "Bajo presupuesto")?.overBudget).toBe(false);
    expect(results.find((c) => c.name === "Sin presupuesto definido")?.overBudget).toBe(false);
  });

  it("cplSpike se dispara cuando el CPL de una campaña supera 1.5x el promedio del sistema", async () => {
    const a = await createTestCampaign({ name: "A" });
    await createTestCampaignSpend(a.id, { amount: 100 });
    await createTestLead({ campaignId: a.id }); // cpl 100

    const b = await createTestCampaign({ name: "B" });
    await createTestCampaignSpend(b.id, { amount: 100 });
    await createTestLead({ campaignId: b.id }); // cpl 100

    const spike = await createTestCampaign({ name: "Spike" });
    await createTestCampaignSpend(spike.id, { amount: 900 });
    await createTestLead({ campaignId: spike.id }); // cpl 900, promedio de las 3 = 366.67, umbral 550

    const results = await getCampaignsWithMetrics();
    expect(results.find((c) => c.name === "A")?.cplSpike).toBe(false);
    expect(results.find((c) => c.name === "Spike")?.cplSpike).toBe(true);
  });

  it("excluye campañas borradas lógicamente", async () => {
    await createTestCampaign({ name: "Activa" });
    await createTestCampaign({ name: "Eliminada", deletedAt: new Date() });

    const results = await getCampaignsWithMetrics();
    expect(results.map((c) => c.name)).toEqual(["Activa"]);
  });
});

describe("getCampaignSpend", () => {
  it("devuelve las entradas de gasto de una campaña ordenadas por fecha descendente", async () => {
    const campaign = await createTestCampaign();
    await createTestCampaignSpend(campaign.id, { spendDate: "2026-01-01", amount: 50 });
    await createTestCampaignSpend(campaign.id, { spendDate: "2026-01-15", amount: 75 });

    const entries = await getCampaignSpend(campaign.id);
    expect(entries).toHaveLength(2);
    expect(entries[0].amount).toBe(75);
    expect(entries[1].amount).toBe(50);
  });

  it("no mezcla gasto de otra campaña", async () => {
    const a = await createTestCampaign();
    const b = await createTestCampaign();
    await createTestCampaignSpend(a.id, { amount: 10 });
    await createTestCampaignSpend(b.id, { amount: 20 });

    const entries = await getCampaignSpend(a.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(10);
  });
});
