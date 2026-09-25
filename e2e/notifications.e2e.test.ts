import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { BASE_URL } from "./helpers/config";
import { query } from "../src/lib/db";
import { notifyLeadFollowUps } from "../src/lib/queries/notifications";
import { createTestLead, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Notificaciones in-app — extremo a extremo", () => {
  it("GET /api/notifications devuelve solo las propias, con el conteo de no leídas", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const lead = await createTestLead({ ownerId: user.id });
    await query(`UPDATE leads SET next_follow_up_at = CURRENT_DATE WHERE id = $1;`, [lead.id]);
    await notifyLeadFollowUps();

    const userClient = await loginAs(user.email, "SuperSecret123456");
    const res = await userClient.get("/api/notifications");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].type).toBe("lead_follow_up");
    expect(body.unreadCount).toBe(1);
  });

  it("un usuario nunca ve las notificaciones de otro", async () => {
    const owner = await createTestUser({ password: "SuperSecret123456" });
    const other = await createTestUser({ password: "SuperSecret123456" });
    const lead = await createTestLead({ ownerId: owner.id });
    await query(`UPDATE leads SET next_follow_up_at = CURRENT_DATE WHERE id = $1;`, [lead.id]);
    await notifyLeadFollowUps();

    const otherClient = await loginAs(other.email, "SuperSecret123456");
    const res = await otherClient.get("/api/notifications");
    const body = await res.json();
    expect(body.notifications).toHaveLength(0);
    expect(body.unreadCount).toBe(0);
  });

  it("PATCH /api/notifications/[id] marca como leída y baja el conteo", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const lead = await createTestLead({ ownerId: user.id });
    await query(`UPDATE leads SET next_follow_up_at = CURRENT_DATE WHERE id = $1;`, [lead.id]);
    await notifyLeadFollowUps();

    const userClient = await loginAs(user.email, "SuperSecret123456");
    const listRes = await userClient.get("/api/notifications");
    const { notifications } = await listRes.json();

    const patchRes = await userClient.patch(`/api/notifications/${notifications[0].id}`);
    expect(patchRes.status).toBe(200);

    const afterRes = await userClient.get("/api/notifications");
    const after = await afterRes.json();
    expect(after.unreadCount).toBe(0);
    expect(after.notifications[0].read).toBe(true);
  });

  it("un usuario no puede marcar como leída la notificación de otro (404, no 403)", async () => {
    const owner = await createTestUser({ password: "SuperSecret123456" });
    const attacker = await createTestUser({ password: "SuperSecret123456" });
    const lead = await createTestLead({ ownerId: owner.id });
    await query(`UPDATE leads SET next_follow_up_at = CURRENT_DATE WHERE id = $1;`, [lead.id]);
    await notifyLeadFollowUps();

    const ownerClient = await loginAs(owner.email, "SuperSecret123456");
    const { notifications } = await (await ownerClient.get("/api/notifications")).json();

    const attackerClient = await loginAs(attacker.email, "SuperSecret123456");
    const res = await attackerClient.patch(`/api/notifications/${notifications[0].id}`);
    expect(res.status).toBe(404);

    const stillUnread = await (await ownerClient.get("/api/notifications")).json();
    expect(stillUnread.unreadCount).toBe(1);
  });

  it("POST /api/notifications marca todas las propias como leídas de una vez", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const leadA = await createTestLead({ ownerId: user.id });
    const leadB = await createTestLead({ ownerId: user.id });
    await query(`UPDATE leads SET next_follow_up_at = CURRENT_DATE WHERE id IN ($1, $2);`, [leadA.id, leadB.id]);
    await notifyLeadFollowUps();

    const userClient = await loginAs(user.email, "SuperSecret123456");
    const markAllRes = await userClient.post("/api/notifications");
    expect(markAllRes.status).toBe(200);

    const after = await (await userClient.get("/api/notifications")).json();
    expect(after.unreadCount).toBe(0);
  });

  it("un ID de notificación inválido responde 400", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const userClient = await loginAs(user.email, "SuperSecret123456");
    const res = await userClient.patch("/api/notifications/no-es-un-numero");
    expect(res.status).toBe(400);
  });

  it("sin sesión, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/notifications`);
    expect(res.status).toBe(401);
  });
});
