import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

const SAMPLE_ITEMS = [{ description: "Diseño UI/UX", quantity: 1, unit_price: 1500 }];

describe("Plantillas de propuesta — extremo a extremo", () => {
  it("admin (proposals:write) guarda una plantilla y la ve en el listado", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await client.post("/api/proposal-templates", {
      name: "Sitio institucional",
      currency: "USD",
      tax_rate: 19,
      items: SAMPLE_ITEMS,
    });
    expect(createRes.status).toBe(200);

    const listRes = await client.get("/api/proposal-templates");
    expect(listRes.status).toBe(200);
    const { templates } = await listRes.json();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Sitio institucional");
  });

  it("traffiker (sin proposals:write) no puede guardar una plantilla", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await client.post("/api/proposal-templates", { name: "X", items: SAMPLE_ITEMS });
    expect(res.status).toBe(403);
  });

  it("traffiker (sin proposals:read) no puede listar plantillas", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await client.get("/api/proposal-templates");
    expect(res.status).toBe(403);
  });

  it("rechaza una plantilla sin partidas (400)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await loginAs(admin.email, "SuperSecret123456");

    const res = await client.post("/api/proposal-templates", { name: "Vacía", items: [] });
    expect(res.status).toBe(400);
  });

  it("sales_manager (proposals:write) borra una plantilla creada por admin", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/proposal-templates", { name: "Compartida", items: SAMPLE_ITEMS });
    const { id } = await createRes.json();

    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");
    const deleteRes = await salesClient.delete(`/api/proposal-templates/${id}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await adminClient.get("/api/proposal-templates");
    const { templates } = await listRes.json();
    expect(templates).toHaveLength(0);
  });

  it("borrar una plantilla inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await loginAs(admin.email, "SuperSecret123456");

    const res = await client.delete("/api/proposal-templates/999999");
    expect(res.status).toBe(404);
  });

  it("traffiker (sin proposals:write) no puede borrar una plantilla", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/proposal-templates", { name: "Protegida", items: SAMPLE_ITEMS });
    const { id } = await createRes.json();

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await traffikerClient.delete(`/api/proposal-templates/${id}`);
    expect(res.status).toBe(403);
  });
});
