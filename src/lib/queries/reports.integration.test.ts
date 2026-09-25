import { beforeEach, describe, expect, it } from "vitest";
import { getExecutiveReport } from "./reports";
import { query } from "../db";
import {
  createTestCampaign,
  createTestClient,
  createTestInvoice,
  createTestLead,
  createTestPayment,
  createTestProject,
  resetTestDb,
} from "../testHelpers/db";

// Tasa fija — nunca se llama a getUsdToCopRate() (ni a la red) porque
// siempre se pasa `prefetchedRate` explícito, mismo criterio que
// profitability.integration.test.ts.
const RATE = 4000;

beforeEach(async () => {
  await resetTestDb();
});

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

describe("getExecutiveReport", () => {
  it("sin datos: 12 meses en cero, sin leads/canales, sin proyectos", async () => {
    const report = await getExecutiveReport(RATE);
    expect(report.monthlyRevenue).toHaveLength(12);
    expect(report.monthlyRevenue.every((m) => m.totalCop === 0)).toBe(true);
    expect(report.leadsByChannel).toEqual([]);
    expect(report.projectsByStatus).toEqual([]);
    expect(report.kpis.revenueLast12MonthsCop).toBe(0);
    expect(report.kpis.leadsLast12Months).toBe(0);
    expect(report.kpis.conversionRatePct).toBeNull();
    expect(report.kpis.avgMarginPct).toBeNull();
  });

  it("agrega pagos del mes actual convertidos a COP en el último punto de la serie", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoiceUsd = await createTestInvoice(project.id, { amount: 1000, currency: "USD" });
    await createTestPayment(invoiceUsd.id, { amount: 1000 });
    const invoiceCop = await createTestInvoice(project.id, { amount: 500000, currency: "COP" });
    await createTestPayment(invoiceCop.id, { amount: 500000 });

    const report = await getExecutiveReport(RATE);
    const currentMonth = report.monthlyRevenue.find((m) => m.month === currentMonthKey());
    expect(currentMonth?.totalCop).toBe(1000 * RATE + 500000);
    expect(report.kpis.revenueLast12MonthsCop).toBe(1000 * RATE + 500000);
  });

  it("no cuenta pagos de facturas borradas lógicamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, deletedAt: new Date() });
    await createTestPayment(invoice.id, { amount: 1000 });

    const report = await getExecutiveReport(RATE);
    expect(report.kpis.revenueLast12MonthsCop).toBe(0);
  });

  it("agrupa leads por el canal de su campaña vinculada, o 'sin_campana' si no tiene", async () => {
    const campaign = await createTestCampaign({ channel: "meta_ads" });
    await createTestLead({ campaignId: campaign.id });
    await createTestLead({ campaignId: campaign.id });
    await createTestLead({ campaignId: null });

    const report = await getExecutiveReport(RATE);
    const metaAds = report.leadsByChannel.find((c) => c.channel === "meta_ads");
    const sinCampana = report.leadsByChannel.find((c) => c.channel === "sin_campana");
    expect(metaAds?.count).toBe(2);
    expect(sinCampana?.count).toBe(1);
    expect(report.kpis.leadsLast12Months).toBe(3);
  });

  it("cuenta wonCount y la tasa de conversión solo sobre leads en estado Ganado", async () => {
    await createTestLead({ status: "Ganado" });
    await createTestLead({ status: "Nuevo" });
    await createTestLead({ status: "Perdido" });

    const report = await getExecutiveReport(RATE);
    const wonCount = report.leadsByChannel.reduce((sum, c) => sum + c.wonCount, 0);
    expect(wonCount).toBe(1);
    expect(report.kpis.conversionRatePct).toBeCloseTo((1 / 3) * 100, 5);
  });

  it("no cuenta leads borrados lógicamente ni fuera de la ventana de 12 meses", async () => {
    await createTestLead({ deletedAt: new Date() });
    await createTestLead({ createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) });

    const report = await getExecutiveReport(RATE);
    expect(report.kpis.leadsLast12Months).toBe(0);
  });

  it("agrupa proyectos por su estado actual, excluyendo los borrados lógicamente", async () => {
    const client = await createTestClient();
    await createTestProject(client.id, { status: "En Desarrollo" });
    await createTestProject(client.id, { status: "En Desarrollo" });
    await createTestProject(client.id, { status: "Entregado" });
    const deletedProject = await createTestProject(client.id, { status: "Planificación" });
    await query(`UPDATE projects SET deleted_at = now() WHERE id = $1;`, [deletedProject.id]);

    const report = await getExecutiveReport(RATE);
    const enDesarrollo = report.projectsByStatus.find((p) => p.status === "En Desarrollo");
    const entregado = report.projectsByStatus.find((p) => p.status === "Entregado");
    expect(enDesarrollo?.count).toBe(2);
    expect(entregado?.count).toBe(1);
    expect(report.projectsByStatus.reduce((sum, p) => sum + p.count, 0)).toBe(3);
  });

  it("calcula el margen promedio solo sobre proyectos con algo facturado", async () => {
    const client = await createTestClient();
    const projectBilled = await createTestProject(client.id);
    const invoice = await createTestInvoice(projectBilled.id, { amount: 1000, currency: "USD" });
    await createTestPayment(invoice.id, { amount: 1000 });
    await createTestProject(client.id); // sin facturar, no debe entrar al promedio

    const report = await getExecutiveReport(RATE);
    expect(report.kpis.avgMarginPct).not.toBeNull();
  });
});
