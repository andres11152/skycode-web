import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

function subscriptionPayload(endpoint = "https://push.example.com/a") {
  return { endpoint, keys: { p256dh: "p256dh-value", auth: "auth-value" } };
}

describe("Suscripción a notificaciones push — autogestión, cualquier sesión", () => {
  it("cualquier rol interno puede suscribirse (sin permiso RBAC)", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const browser = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await browser.post("/api/push/subscribe", subscriptionPayload());
    expect(res.status).toBe(200);

    const row = await query("SELECT user_id, p256dh, auth FROM push_subscriptions WHERE endpoint = $1;", [
      "https://push.example.com/a",
    ]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].p256dh).toBe("p256dh-value");
  });

  it("un cliente de portal también puede suscribirse (autogestión pura, sin distinción de rol)", async () => {
    const clientUser = await createTestUser({ role: "client", password: "SuperSecret123456" });
    const browser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await browser.post("/api/push/subscribe", subscriptionPayload());
    expect(res.status).toBe(200);
  });

  it("sin sesión, da 401", async () => {
    const { TestClient } = await import("./helpers/client");
    const res = await new TestClient().post("/api/push/subscribe", subscriptionPayload());
    expect(res.status).toBe(401);
  });

  it("un endpoint que no es una URL válida da 400", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const res = await browser.post("/api/push/subscribe", { endpoint: "no-es-una-url", keys: { p256dh: "p", auth: "a" } });
    expect(res.status).toBe(400);
  });

  it("re-suscribirse con el mismo endpoint actualiza en vez de duplicar", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    await browser.post("/api/push/subscribe", subscriptionPayload());
    await browser.post("/api/push/subscribe", { ...subscriptionPayload(), keys: { p256dh: "nuevo", auth: "nuevo" } });

    const row = await query("SELECT p256dh FROM push_subscriptions WHERE endpoint = $1;", ["https://push.example.com/a"]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].p256dh).toBe("nuevo");
  });

  it("DELETE borra la propia suscripción", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");
    await browser.post("/api/push/subscribe", subscriptionPayload());

    const res = await browser.fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://push.example.com/a" }),
    });
    expect(res.status).toBe(200);

    const row = await query("SELECT id FROM push_subscriptions WHERE endpoint = $1;", ["https://push.example.com/a"]);
    expect(row.rows).toEqual([]);
  });

  it("DELETE no puede borrar la suscripción de otra persona", async () => {
    const owner = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const attacker = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const ownerBrowser = await loginAs(owner.email, "SuperSecret123456");
    const attackerBrowser = await loginAs(attacker.email, "SuperSecret123456");
    await ownerBrowser.post("/api/push/subscribe", subscriptionPayload());

    await attackerBrowser.fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://push.example.com/a" }),
    });

    const row = await query("SELECT id FROM push_subscriptions WHERE endpoint = $1;", ["https://push.example.com/a"]);
    expect(row.rows).toHaveLength(1);
  });
});
