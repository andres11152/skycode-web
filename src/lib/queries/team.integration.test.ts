import { beforeEach, describe, expect, it } from "vitest";
import { getTeamMemberDetail, getTeamMembers, updateTeamMember, LastAdminError } from "./team";
import { getUserActivity } from "./audit";
import { getActiveUserSessions } from "./sessions";
import { query, withTransaction } from "../db";
import { createTestSession, createTestUser, resetTestDb } from "../testHelpers/db";

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

describe("updateTeamMember — ficha de persona", () => {
  it("actualiza nombre, teléfono, cargo y fecha de ingreso", async () => {
    const user = await createTestUser({ name: "Antes" });
    await withTransaction((c) =>
      updateTeamMember({ id: user.id, name: "Después", phone: "+57 300 111 2222", jobTitle: "Dev Senior", hireDate: "2024-03-15" }, c)
    );

    const detail = await getTeamMemberDetail(user.id);
    expect(detail?.name).toBe("Después");
    expect(detail?.phone).toBe("+57 300 111 2222");
    expect(detail?.jobTitle).toBe("Dev Senior");
    // `hire_date::text`: nunca se desalinea un día por zona horaria.
    expect(detail?.hireDate).toBe("2024-03-15");
  });

  it("permite borrar campos opcionales mandándolos en null", async () => {
    const user = await createTestUser();
    await withTransaction((c) => updateTeamMember({ id: user.id, phone: "+57 300 111 2222", jobTitle: "Dev" }, c));
    await withTransaction((c) => updateTeamMember({ id: user.id, phone: null }, c));

    const detail = await getTeamMemberDetail(user.id);
    expect(detail?.phone).toBeNull();
    expect(detail?.jobTitle).toBe("Dev");
  });

  it("cambiar el correo revoca todas sus sesiones (es su identidad de login)", async () => {
    const user = await createTestUser();
    await createTestSession(user.id);
    await createTestSession(user.id);

    await withTransaction((c) => updateTeamMember({ id: user.id, email: "nuevo-correo@test.local" }, c));
    expect(await getActiveUserSessions(user.id)).toHaveLength(0);
  });

  it("guardar el MISMO correo no revoca sesiones", async () => {
    const user = await createTestUser();
    await createTestSession(user.id);

    await withTransaction((c) => updateTeamMember({ id: user.id, email: user.email, name: "Otro" }, c));
    expect(await getActiveUserSessions(user.id)).toHaveLength(1);
  });

  it("un correo ya usado por otra cuenta viola el UNIQUE (la ruta lo traduce a 409)", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await expect(withTransaction((c) => updateTeamMember({ id: b.id, email: a.email }, c))).rejects.toMatchObject({ code: "23505" });
  });

  it("el diff de auditoría (before/after) nunca incluye password_hash", async () => {
    const user = await createTestUser();
    const result = await withTransaction((c) => updateTeamMember({ id: user.id, name: "X" }, c));
    expect(JSON.stringify(result)).not.toContain("password_hash");
  });
});

describe("getTeamMemberDetail", () => {
  it("incluye costo/capacidad y 2FA como booleano, nunca el secreto", async () => {
    const user = await createTestUser({ hourlyCost: 50000 });
    await query("UPDATE users SET totp_secret = 'SECRETO', totp_enabled = true WHERE id = $1;", [user.id]);

    const detail = await getTeamMemberDetail(user.id);
    expect(detail?.hourlyCost).toBe(50000);
    expect(detail?.totpEnabled).toBe(true);
    expect(JSON.stringify(detail)).not.toContain("SECRETO");
  });
});

describe("getUserActivity", () => {
  it("trae lo que la persona hizo y lo que se le hizo, no la actividad de otros", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const insert = (actorId: number, action: string, entityType: string, entityId: string) =>
      query(
        "INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id) VALUES ($1, 'x@test.local', $2, $3, $4);",
        [actorId, action, entityType, entityId]
      );
    await insert(user.id, "lead.update", "lead", "7"); // hizo
    await insert(admin.id, "team.update", "user", String(user.id)); // se le hizo
    await insert(admin.id, "lead.update", "lead", "8"); // ajeno

    const activity = await getUserActivity(user.id);
    expect(activity.map((a) => a.action).sort()).toEqual(["lead.update", "team.update"]);
    expect(activity.every((a) => a.diff === null)).toBe(true);
  });
});


describe("updateTeamMember — protecciones", () => {
  it("no deja el sistema sin admin activo (degradar ni desactivar al último)", async () => {
    const admin = await createTestUser({ role: "admin" });
    await expect(withTransaction((c) => updateTeamMember({ id: admin.id, role: "traffiker" }, c))).rejects.toBeInstanceOf(LastAdminError);
    await expect(withTransaction((c) => updateTeamMember({ id: admin.id, status: "disabled" }, c))).rejects.toBeInstanceOf(LastAdminError);

    const other = await createTestUser({ role: "admin" });
    const ok = await withTransaction((c) => updateTeamMember({ id: admin.id, role: "traffiker" }, c));
    expect(ok?.after.role).toBe("traffiker");
    // El otro es ahora el último.
    await expect(withTransaction((c) => updateTeamMember({ id: other.id, role: "traffiker" }, c))).rejects.toBeInstanceOf(LastAdminError);
  });

  it("no actúa sobre cuentas de portal (client)", async () => {
    const portalUser = await createTestUser({ role: "client" });
    expect(await withTransaction((c) => updateTeamMember({ id: portalUser.id, role: "admin" }, c))).toBeNull();
  });
});
