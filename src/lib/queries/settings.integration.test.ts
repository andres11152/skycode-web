import { beforeEach, describe, expect, it } from "vitest";
import { getSettings, updateSettings, consumeNextInvoiceNumber } from "./settings";
import { withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getSettings", () => {
  it("siempre existe la fila id=1 con los valores por defecto de la migración", async () => {
    const settings = await getSettings();
    expect(settings.defaultTaxRatePct).toBe(0);
    expect(settings.invoiceNumberPrefix).toBe("FAC-");
    expect(settings.invoiceNextNumber).toBe(1);
    expect(settings.slaHoursUrgente).toBe(4);
    expect(settings.slaHoursAlta).toBe(24);
    expect(settings.slaHoursMedia).toBe(72);
    expect(settings.slaHoursBaja).toBe(120);
    expect(settings.manualUsdToCopRate).toBeNull();
  });
});

describe("updateSettings", () => {
  it("actualiza solo los campos enviados, deja el resto intacto (COALESCE)", async () => {
    const user = await createTestUser();
    await updateSettings({ default_tax_rate_pct: 19 }, user.id);

    const settings = await getSettings();
    expect(settings.defaultTaxRatePct).toBe(19);
    expect(settings.invoiceNumberPrefix).toBe("FAC-"); // sin cambios
  });

  it("permite fijar una tasa de cambio manual", async () => {
    const user = await createTestUser();
    await updateSettings({ manual_usd_to_cop_rate: 4200 }, user.id);

    const settings = await getSettings();
    expect(settings.manualUsdToCopRate).toBe(4200);
  });

  it("permite volver a null la tasa manual explícitamente (no solo omitirla)", async () => {
    const user = await createTestUser();
    await updateSettings({ manual_usd_to_cop_rate: 4200 }, user.id);
    await updateSettings({ manual_usd_to_cop_rate: null }, user.id);

    const settings = await getSettings();
    expect(settings.manualUsdToCopRate).toBeNull();
  });

  it("actualiza las horas de SLA por prioridad", async () => {
    const user = await createTestUser();
    await updateSettings({ sla_hours_urgente: 2, sla_hours_baja: 200 }, user.id);

    const settings = await getSettings();
    expect(settings.slaHoursUrgente).toBe(2);
    expect(settings.slaHoursBaja).toBe(200);
    expect(settings.slaHoursAlta).toBe(24); // sin cambios
  });
});

describe("consumeNextInvoiceNumber", () => {
  it("avanza el contador y formatea con ceros a la izquierda", async () => {
    const first = await withTransaction((c) => consumeNextInvoiceNumber(c));
    const second = await withTransaction((c) => consumeNextInvoiceNumber(c));

    expect(first).toBe("FAC-0001");
    expect(second).toBe("FAC-0002");
  });

  it("usa el prefijo vigente en el momento de consumir, no uno fijo", async () => {
    const user = await createTestUser();
    await updateSettings({ invoice_number_prefix: "2026-" }, user.id);

    const number = await withTransaction((c) => consumeNextInvoiceNumber(c));
    expect(number).toBe("2026-0001");
  });
});
