import { beforeEach, describe, expect, it } from "vitest";
import {
  saveSubscription,
  deleteSubscription,
  deleteSubscriptionByEndpoint,
  getSubscriptionsForUser,
  hasAnyPushSubscription,
} from "./pushSubscriptions";
import { query } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("saveSubscription", () => {
  it("guarda una suscripción nueva", async () => {
    const user = await createTestUser();
    await saveSubscription(user.id, { endpoint: "https://push.example.com/a", p256dh: "p1", auth: "a1" });

    const subs = await getSubscriptionsForUser(user.id);
    expect(subs).toEqual([{ endpoint: "https://push.example.com/a", p256dh: "p1", auth: "a1" }]);
  });

  it("re-suscribirse con el mismo endpoint actualiza las claves, no duplica la fila", async () => {
    const user = await createTestUser();
    await saveSubscription(user.id, { endpoint: "https://push.example.com/a", p256dh: "old", auth: "old" });
    await saveSubscription(user.id, { endpoint: "https://push.example.com/a", p256dh: "new", auth: "new" });

    const subs = await getSubscriptionsForUser(user.id);
    expect(subs).toHaveLength(1);
    expect(subs[0].p256dh).toBe("new");
  });

  it("el mismo endpoint puede reasignarse a otro usuario (dispositivo compartido)", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await saveSubscription(userA.id, { endpoint: "https://push.example.com/shared", p256dh: "p", auth: "a" });
    await saveSubscription(userB.id, { endpoint: "https://push.example.com/shared", p256dh: "p", auth: "a" });

    expect(await getSubscriptionsForUser(userA.id)).toEqual([]);
    expect(await getSubscriptionsForUser(userB.id)).toHaveLength(1);
  });

  it("un usuario puede tener varias suscripciones (varios navegadores/dispositivos)", async () => {
    const user = await createTestUser();
    await saveSubscription(user.id, { endpoint: "https://push.example.com/a", p256dh: "p", auth: "a" });
    await saveSubscription(user.id, { endpoint: "https://push.example.com/b", p256dh: "p", auth: "a" });

    expect(await getSubscriptionsForUser(user.id)).toHaveLength(2);
  });
});

describe("deleteSubscription", () => {
  it("borra solo la suscripción del propio usuario, no la de otro", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    await saveSubscription(owner.id, { endpoint: "https://push.example.com/owned", p256dh: "p", auth: "a" });

    await deleteSubscription(attacker.id, "https://push.example.com/owned");
    expect(await getSubscriptionsForUser(owner.id)).toHaveLength(1);

    await deleteSubscription(owner.id, "https://push.example.com/owned");
    expect(await getSubscriptionsForUser(owner.id)).toEqual([]);
  });
});

describe("deleteSubscriptionByEndpoint", () => {
  it("borra sin importar el dueño (usado cuando el push service invalida el endpoint)", async () => {
    const user = await createTestUser();
    await saveSubscription(user.id, { endpoint: "https://push.example.com/dead", p256dh: "p", auth: "a" });

    await deleteSubscriptionByEndpoint("https://push.example.com/dead");
    expect(await getSubscriptionsForUser(user.id)).toEqual([]);
  });
});

describe("hasAnyPushSubscription", () => {
  it("devuelve false sin suscripciones, true con al menos una", async () => {
    const user = await createTestUser();
    expect(await hasAnyPushSubscription(user.id)).toBe(false);

    await saveSubscription(user.id, { endpoint: "https://push.example.com/a", p256dh: "p", auth: "a" });
    expect(await hasAnyPushSubscription(user.id)).toBe(true);
  });
});

describe("cascada al borrar un usuario", () => {
  it("borrar el usuario borra sus suscripciones (ON DELETE CASCADE)", async () => {
    const user = await createTestUser();
    await saveSubscription(user.id, { endpoint: "https://push.example.com/a", p256dh: "p", auth: "a" });

    await query(`DELETE FROM users WHERE id = $1;`, [user.id]);
    const res = await query(`SELECT id FROM push_subscriptions WHERE endpoint = $1;`, ["https://push.example.com/a"]);
    expect(res.rows).toEqual([]);
  });
});
