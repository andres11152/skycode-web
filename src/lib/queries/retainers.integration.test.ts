import { beforeEach, describe, expect, it } from "vitest";
import { createRetainer, getRetainers, updateRetainer, softDeleteRetainer, generateDueRetainerInvoices } from "./retainers";
import { query, withTransaction } from "../db";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createRetainer / getRetainers", () => {
  it("crea un retainer derivando el client_id del proyecto", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    const id = await withTransaction((c) =>
      createRetainer(
        { project_id: project.id, description: "Mantenimiento mensual", amount: 500, currency: "USD", billing_day: 5, next_invoice_date: "2026-10-05" },
        user.id,
        c
      )
    );
    expect(id).not.toBeNull();

    const retainers = await getRetainers();
    expect(retainers).toHaveLength(1);
    expect(retainers[0].client_id).toBe(client.id);
    expect(retainers[0].client_name).toBe(client.name);
    expect(retainers[0].status).toBe("active");
  });

  it("devuelve null si el proyecto no existe", async () => {
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createRetainer(
        { project_id: 999999, description: "x", amount: 100, billing_day: 1, next_invoice_date: "2026-01-01" },
        user.id,
        c
      )
    );
    expect(id).toBeNull();
  });

  it("no lista retainers borrados lógicamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createRetainer({ project_id: project.id, description: "x", amount: 100, billing_day: 1, next_invoice_date: "2026-01-01" }, user.id, c)
    );

    await withTransaction((c) => softDeleteRetainer(id!, c));
    expect(await getRetainers()).toHaveLength(0);
  });
});

describe("updateRetainer", () => {
  it("cambia el estado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createRetainer({ project_id: project.id, description: "x", amount: 100, billing_day: 1, next_invoice_date: "2026-01-01" }, user.id, c)
    );

    const updated = await withTransaction((c) => updateRetainer(id!, { status: "paused" }, c));
    expect(updated).toBe(true);

    const [retainer] = await getRetainers();
    expect(retainer.status).toBe("paused");
  });

  it("devuelve false si no se envía ningún campo", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createRetainer({ project_id: project.id, description: "x", amount: 100, billing_day: 1, next_invoice_date: "2026-01-01" }, user.id, c)
    );

    expect(await withTransaction((c) => updateRetainer(id!, {}, c))).toBe(false);
  });

  it("devuelve false para un retainer inexistente o ya borrado", async () => {
    expect(await withTransaction((c) => updateRetainer(999999, { status: "paused" }, c))).toBe(false);
  });
});

describe("generateDueRetainerInvoices", () => {
  it("genera una factura para un retainer activo cuya fecha ya llegó, y avanza un mes", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    await withTransaction((c) =>
      createRetainer(
        { project_id: project.id, description: "Soporte mensual", amount: 800, currency: "USD", billing_day: 1, next_invoice_date: "2020-01-01" },
        user.id,
        c
      )
    );

    const count = await generateDueRetainerInvoices();
    expect(count).toBe(1);

    const invoiceRes = await query(`SELECT description, amount, currency, project_id FROM invoices WHERE project_id = $1;`, [project.id]);
    expect(invoiceRes.rows).toHaveLength(1);
    expect(invoiceRes.rows[0].description).toContain("Soporte mensual");
    expect(Number(invoiceRes.rows[0].amount)).toBe(800);

    const [retainer] = await getRetainers();
    expect(retainer.next_invoice_date).toBe("2020-02-01");
  });

  it("no genera factura para un retainer pausado o cancelado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createRetainer({ project_id: project.id, description: "x", amount: 100, billing_day: 1, next_invoice_date: "2020-01-01" }, user.id, c)
    );
    await withTransaction((c) => updateRetainer(id!, { status: "paused" }, c));

    expect(await generateDueRetainerInvoices()).toBe(0);
  });

  it("no genera factura si la fecha todavía no llega", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    await withTransaction((c) =>
      createRetainer({ project_id: project.id, description: "x", amount: 100, billing_day: 1, next_invoice_date: "2099-01-01" }, user.id, c)
    );

    expect(await generateDueRetainerInvoices()).toBe(0);
  });

  it("es idempotente dentro del mismo día: correrlo dos veces seguidas no duplica la factura", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    // Fecha de HOY (no una fecha vieja): tras generar una factura, la
    // próxima queda en el mes siguiente — en el futuro, no vencida
    // todavía. Con una fecha vieja fija (ej. "2020-01-01"), avanzar un
    // mes seguiría dando una fecha pasada, y una segunda corrida
    // generaría OTRA factura de un mes distinto — eso es el
    // comportamiento correcto de "recuperar atraso" (ver el comentario de
    // generateDueRetainerInvoices()), no un fallo de idempotencia; probar
    // idempotencia real requiere partir de una fecha que quede en el
    // futuro apenas se genera la primera.
    const today = new Date().toISOString().slice(0, 10);
    await withTransaction((c) =>
      createRetainer({ project_id: project.id, description: "x", amount: 100, billing_day: 1, next_invoice_date: today }, user.id, c)
    );

    const first = await generateDueRetainerInvoices();
    const second = await generateDueRetainerInvoices();
    expect(first).toBe(1);
    expect(second).toBe(0);

    const invoiceRes = await query(`SELECT id FROM invoices WHERE project_id = $1;`, [project.id]);
    expect(invoiceRes.rows).toHaveLength(1);
  });
});
