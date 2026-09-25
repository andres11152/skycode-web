import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Horas contractuales por persona — PATCH /api/team", () => {
  it("admin (team:write) edita la capacidad semanal de otro miembro", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "sales_manager" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch("/api/team", { id: dev.id, weeklyHoursCapacity: 20 });
    expect(res.status).toBe(200);
    const { member } = await res.json();
    expect(member.weekly_hours_capacity).toBe(20);

    const listRes = await adminClient.get("/api/team");
    const { members } = await listRes.json();
    expect(members.find((m: { id: number }) => m.id === dev.id).weekly_hours_capacity).toBe(20);
  });

  it("un valor nuevo trae 40h por default hasta que se edite", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "traffiker" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.get("/api/team");
    const { members } = await res.json();
    expect(members.find((m: { id: number }) => m.id === dev.id).weekly_hours_capacity).toBe(40);
  });

  it("un valor por encima de 168h (una semana completa) da 400", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "sales_manager" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch("/api/team", { id: dev.id, weeklyHoursCapacity: 200 });
    expect(res.status).toBe(400);
  });

  it("un valor negativo o cero da 400", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "sales_manager" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.patch("/api/team", { id: dev.id, weeklyHoursCapacity: 0 })).status).toBe(400);
    expect((await adminClient.patch("/api/team", { id: dev.id, weeklyHoursCapacity: -5 })).status).toBe(400);
  });

  it("sales_manager sin team:write no puede editar la capacidad de nadie", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "traffiker" });
    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");

    const res = await salesClient.patch("/api/team", { id: dev.id, weeklyHoursCapacity: 30 });
    expect(res.status).toBe(403);
  });

  it("editar la capacidad no afecta el costo por hora ya guardado", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "sales_manager" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    await adminClient.patch("/api/team", { id: dev.id, hourlyCost: 25000, hourlyCostCurrency: "COP" });
    const res = await adminClient.patch("/api/team", { id: dev.id, weeklyHoursCapacity: 20 });
    const { member } = await res.json();
    expect(member.hourly_cost).toBe(25000);
    expect(member.weekly_hours_capacity).toBe(20);
  });
});
