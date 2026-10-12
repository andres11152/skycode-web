import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("POST /api/landing-events", () => {
  it("registra un clic a WhatsApp sin sesión y sin datos personales", async () => {
    const visitor = new TestClient();
    const res = await visitor.post("/api/landing-events", {
      kind: "whatsapp_click",
      landing_page: "/landing",
      utm_source: "google",
      gclid: "gclid-de-prueba",
    });
    expect(res.status).toBe(200);

    const rows = await query("SELECT kind, landing_page, utm_source, gclid FROM landing_events;");
    expect(rows.rows).toEqual([
      { kind: "whatsapp_click", landing_page: "/landing", utm_source: "google", gclid: "gclid-de-prueba" },
    ]);
  });

  it("cuenta el clic aunque no haya consentimiento (sin atribución)", async () => {
    const res = await new TestClient().post("/api/landing-events", { kind: "whatsapp_click", landing_page: "/landing" });
    expect(res.status).toBe(200);
    const rows = await query("SELECT gclid, utm_campaign FROM landing_events;");
    expect(rows.rows).toEqual([{ gclid: null, utm_campaign: null }]);
  });

  it("rechaza una ruta que no es de una landing y un tipo desconocido", async () => {
    const visitor = new TestClient();
    expect((await visitor.post("/api/landing-events", { kind: "whatsapp_click", landing_page: "/dashboard" })).status).toBe(400);
    expect((await visitor.post("/api/landing-events", { kind: "otro", landing_page: "/landing" })).status).toBe(400);
    const rows = await query("SELECT count(*)::int AS n FROM landing_events;");
    expect(rows.rows[0].n).toBe(0);
  });
});

describe("Aviso inmediato de lead nuevo", () => {
  it("el formulario de la landing crea el lead con origen 'Landing Ads' y avisa a admin y comercial, no a otros roles", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const sales = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });

    const res = await new TestClient().post("/api/contact", {
      name: "Laura Prueba",
      email: `laura-${Date.now()}@empresa-prueba.co`,
      message: "Necesitamos integrar Siigo con nuestra tienda.",
      formContext: "Landing Ads",
      utm_source: "google",
      gclid: "gclid-landing",
      landing_page: "/landing",
      consent: true,
      locale: "es",
    });
    expect(res.status).toBe(200);

    const lead = await query("SELECT source, gclid, landing_page FROM leads;");
    expect(lead.rows).toEqual([{ source: "Landing Ads", gclid: "gclid-landing", landing_page: "/landing" }]);

    // El aviso se dispara sin esperarlo: se reintenta un momento hasta que aparezca.
    let notified: { user_id: number; type: string }[] = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const rows = await query("SELECT user_id, type FROM notifications ORDER BY user_id;");
      notified = rows.rows;
      if (notified.length >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(notified.map((n) => n.user_id).sort()).toEqual([admin.id, sales.id].sort());
    expect(notified.every((n) => n.type === "lead_new")).toBe(true);
    expect(notified.some((n) => n.user_id === traffiker.id)).toBe(false);

    // La campanita del comercial lo muestra.
    const salesClient = await loginAs(sales.email, "SuperSecret123456");
    const list = await (await salesClient.get("/api/notifications")).json();
    expect(JSON.stringify(list)).toContain("Lead nuevo");
  });
});

describe("Formulario corto de la landing en /api/contact", () => {
  const base = {
    name: "Mateo Prueba",
    email: "mateo@empresa-prueba.co",
    consent: true,
    locale: "es",
  };

  it("acepta un envío de la landing sin mensaje y lo guarda como 'Landing Ads'", async () => {
    const res = await new TestClient().post("/api/contact", {
      ...base,
      message: "",
      formContext: "Landing Ads",
      serviceSlug: "apis-integraciones",
      landing_page: "/landing/integraciones",
    });
    expect(res.status).toBe(200);
    const rows = await query("SELECT source, message, service, landing_page FROM leads;");
    expect(rows.rows).toEqual([
      { source: "Landing Ads", message: "", service: expect.any(String), landing_page: "/landing/integraciones" },
    ]);
  });

  it("sigue exigiendo el mensaje en el formulario de la home", async () => {
    const res = await new TestClient().post("/api/contact", { ...base, message: "", formContext: "Formulario Web" });
    expect(res.status).toBe(400);
    const rows = await query("SELECT count(*)::int AS n FROM leads;");
    expect(rows.rows[0].n).toBe(0);
  });
});
