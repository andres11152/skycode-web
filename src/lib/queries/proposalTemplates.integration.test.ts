import { beforeEach, describe, expect, it } from "vitest";
import { getProposalTemplates, createProposalTemplate, deleteProposalTemplate } from "./proposalTemplates";
import { withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

const SAMPLE_ITEMS = [
  { description: "Diseño UI/UX", quantity: 1, unit_price: 1500 },
  { description: "Desarrollo frontend", quantity: 40, unit_price: 50 },
];

describe("createProposalTemplate / getProposalTemplates", () => {
  it("guarda una plantilla con sus partidas y la lista de vuelta", async () => {
    const user = await createTestUser();
    await createProposalTemplate({ name: "Sitio institucional", currency: "USD", tax_rate: 19, items: SAMPLE_ITEMS }, user.id);

    const templates = await getProposalTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Sitio institucional");
    expect(templates[0].currency).toBe("USD");
    expect(templates[0].tax_rate).toBe(19);
    expect(templates[0].items).toEqual(SAMPLE_ITEMS);
  });

  it("usa COP y 0% por defecto si no se especifican", async () => {
    const user = await createTestUser();
    await createProposalTemplate({ name: "Plantilla mínima", items: SAMPLE_ITEMS }, user.id);

    const [template] = await getProposalTemplates();
    expect(template.currency).toBe("COP");
    expect(template.tax_rate).toBe(0);
  });

  it("lista más recientes primero", async () => {
    const user = await createTestUser();
    await createProposalTemplate({ name: "Primera", items: SAMPLE_ITEMS }, user.id);
    await createProposalTemplate({ name: "Segunda", items: SAMPLE_ITEMS }, user.id);

    const templates = await getProposalTemplates();
    expect(templates.map((t) => t.name)).toEqual(["Segunda", "Primera"]);
  });
});

describe("deleteProposalTemplate", () => {
  it("borra lógicamente una plantilla — deja de listarse", async () => {
    const user = await createTestUser();
    const id = await createProposalTemplate({ name: "Para borrar", items: SAMPLE_ITEMS }, user.id);

    const deleted = await withTransaction((c) => deleteProposalTemplate(id, c));
    expect(deleted).toBe(true);

    const templates = await getProposalTemplates();
    expect(templates).toHaveLength(0);
  });

  it("devuelve false si la plantilla no existe o ya estaba borrada", async () => {
    const deleted = await withTransaction((c) => deleteProposalTemplate(999999, c));
    expect(deleted).toBe(false);
  });

  it("no reprocesa una plantilla ya borrada (idempotente)", async () => {
    const user = await createTestUser();
    const id = await createProposalTemplate({ name: "Doble borrado", items: SAMPLE_ITEMS }, user.id);

    await withTransaction((c) => deleteProposalTemplate(id, c));
    const second = await withTransaction((c) => deleteProposalTemplate(id, c));
    expect(second).toBe(false);
  });
});
