import { beforeEach, describe, expect, it } from "vitest";
import { getTeamMembers, updateTeamMember } from "./team";
import { query, withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getTeamMembers", () => {
  it("trae weekly_hours_capacity con el default de 40h para un usuario nuevo", async () => {
    const user = await createTestUser({ name: "Nuevo" });
    const members = await getTeamMembers();
    const row = members.find((m) => m.id === user.id);
    expect(row!.weekly_hours_capacity).toBe(40);
  });

  it("no incluye clientes de portal", async () => {
    await createTestUser({ role: "client" });
    const admin = await createTestUser({ role: "admin", name: "Admin" });
    const members = await getTeamMembers();
    expect(members.map((m) => m.id)).toEqual([admin.id]);
  });
});

describe("updateTeamMember — weeklyHoursCapacity", () => {
  it("actualiza la capacidad semanal sin tocar otros campos", async () => {
    const user = await createTestUser({ name: "Freelance", hourlyCost: 50000 });

    const result = await withTransaction((c) => updateTeamMember({ id: user.id, weeklyHoursCapacity: 20 }, c));
    expect(result).not.toBeNull();
    expect(Number(result!.after.weekly_hours_capacity)).toBe(20);
    expect(Number(result!.after.hourly_cost)).toBe(50000); // no se tocó

    const members = await getTeamMembers();
    const row = members.find((m) => m.id === user.id);
    expect(row!.weekly_hours_capacity).toBe(20);
  });

  it("sin weeklyHoursCapacity en el update, el valor existente se conserva", async () => {
    const user = await createTestUser();
    await query(`UPDATE users SET weekly_hours_capacity = 30 WHERE id = $1;`, [user.id]);

    await withTransaction((c) => updateTeamMember({ id: user.id, status: "active" }, c));

    const members = await getTeamMembers();
    const row = members.find((m) => m.id === user.id);
    expect(row!.weekly_hours_capacity).toBe(30);
  });

  it("devuelve null para un usuario inexistente", async () => {
    const result = await withTransaction((c) => updateTeamMember({ id: 999999, weeklyHoursCapacity: 40 }, c));
    expect(result).toBeNull();
  });
});
