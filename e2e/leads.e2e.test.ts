import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs, uniqueSuffix } from "./helpers/client";
import { createTestCampaign, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("POST /api/leads — captura pública con atribución UTM", () => {
  it("crea el lead y lo enlaza automáticamente a la campaña cuyo utm_campaign calza", async () => {
    const campaign = await createTestCampaign({ utmCampaign: `promo-${uniqueSuffix()}` });
    const client = new TestClient();

    const res = await client.post("/api/leads", {
      name: "Prospecto E2E",
      email: `prospecto-${uniqueSuffix()}@test.local`,
      message: "Quiero cotizar un proyecto.",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: campaign.utm_campaign,
      consent: true,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const dbRow = await query("SELECT campaign_id, status FROM leads WHERE id = $1;", [body.lead.id]);
    expect(dbRow.rows[0].campaign_id).toBe(campaign.id);
    expect(dbRow.rows[0].status).toBe("Nuevo");
  });

  it("rechaza datos inválidos con 400 (nombre vacío)", async () => {
    const client = new TestClient();
    const res = await client.post("/api/leads", { name: "", email: `x-${uniqueSuffix()}@test.local` });
    expect(res.status).toBe(400);
  });

  it("bloquea después de 5 solicitudes desde la misma IP en la ventana de rate limit", async () => {
    const client = new TestClient("10.8.8.8");

    for (let i = 0; i < 5; i++) {
      const res = await client.post("/api/leads", {
        name: "Prospecto",
        email: `flood-${uniqueSuffix()}-${i}@test.local`,
        consent: true,
      });
      expect(res.status).toBe(200);
    }

    const blocked = await client.post("/api/leads", {
      name: "Prospecto",
      email: `flood-${uniqueSuffix()}-final@test.local`,
      consent: true,
    });
    expect(blocked.status).toBe(429);
  });
});

describe("GET /api/leads — búsqueda, filtro y paginación autenticadas", () => {
  it("un sales_manager ve, busca y filtra los leads existentes", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const suffix = uniqueSuffix();
    await adminClient.post("/api/leads", { name: "Ana Coincide", email: `ana-${suffix}@test.local`, consent: true });
    await adminClient.post("/api/leads", { name: "Otro Lead", email: `otro-${suffix}@test.local`, consent: true });

    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const client = await loginAs(salesManager.email, "SuperSecret123456");

    const res = await client.get("/api/leads?q=Ana%20Coincide&status=ALL&page=1&pageSize=10");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.leads[0].name).toBe("Ana Coincide");
  });
});

describe("PATCH /api/leads — asignación de dueño y cambio de estado con historial", () => {
  it("asigna un dueño y cambia el estado, registrando una actividad status_change automática", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Lead a asignar",
      email: `asignar-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    const owner = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });

    const patchRes = await adminClient.patch("/api/leads", { id: lead.id, ownerId: owner.id, status: "Ganado" });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.lead.owner_id).toBe(owner.id);
    expect(patched.lead.status).toBe("Ganado");

    const activitiesRes = await adminClient.get(`/api/leads/${lead.id}/activities`);
    const { activities } = await activitiesRes.json();
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe("status_change");
    expect(activities[0].body).toBe("Nuevo → Ganado");
  });

  it("no registra actividad de cambio de estado si el estado no cambió", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Sin cambio real",
      email: `sincambio-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    await adminClient.patch("/api/leads", { id: lead.id, status: "Nuevo" }); // mismo estado que ya tenía

    const activitiesRes = await adminClient.get(`/api/leads/${lead.id}/activities`);
    const { activities } = await activitiesRes.json();
    expect(activities).toHaveLength(0);
  });

  it("404 al intentar actualizar un lead que no existe", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch("/api/leads", { id: 999999, status: "Ganado" });
    expect(res.status).toBe(404);
  });

  it("una notas/actividad manual (tipo call) se puede agregar y aparece en el timeline junto al cambio automático", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Con nota manual",
      email: `notamanual-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    await adminClient.patch("/api/leads", { id: lead.id, status: "En Cotización" });
    const noteRes = await adminClient.post(`/api/leads/${lead.id}/activities`, {
      type: "call",
      body: "Llamada de seguimiento inicial.",
    });
    expect(noteRes.status).toBe(200);

    const activitiesRes = await adminClient.get(`/api/leads/${lead.id}/activities`);
    const { activities } = await activitiesRes.json();
    expect(activities).toHaveLength(2);
    expect(activities.map((a: { type: string }) => a.type).sort()).toEqual(["call", "status_change"]);
  });
});

describe("PATCH /api/leads — recordatorio de seguimiento", () => {
  it("agenda una fecha y una nota de seguimiento", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Lead con seguimiento",
      email: `seguimiento-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    const patchRes = await adminClient.patch("/api/leads", {
      id: lead.id,
      nextFollowUpAt: "2026-10-15",
      followUpNote: "Llamar a las 3pm",
    });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(String(patched.lead.next_follow_up_at).slice(0, 10)).toBe("2026-10-15");
    expect(patched.lead.follow_up_note).toBe("Llamar a las 3pm");

    const row = await query("SELECT next_follow_up_at::text, follow_up_note FROM leads WHERE id = $1;", [lead.id]);
    expect(row.rows[0].next_follow_up_at).toBe("2026-10-15");
    expect(row.rows[0].follow_up_note).toBe("Llamar a las 3pm");
  });

  it("nextFollowUpAt: null borra un recordatorio existente", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Lead a limpiar",
      email: `limpiar-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();
    await adminClient.patch("/api/leads", { id: lead.id, nextFollowUpAt: "2026-10-15", followUpNote: "x" });

    await adminClient.patch("/api/leads", { id: lead.id, nextFollowUpAt: null, followUpNote: null });

    const row = await query("SELECT next_follow_up_at, follow_up_note FROM leads WHERE id = $1;", [lead.id]);
    expect(row.rows[0].next_follow_up_at).toBeNull();
    expect(row.rows[0].follow_up_note).toBeNull();
  });

  it("400 con fecha en formato inválido", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Fecha inválida",
      email: `fechainvalida-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    const res = await adminClient.patch("/api/leads", { id: lead.id, nextFollowUpAt: "15/10/2026" });
    expect(res.status).toBe(400);
  });

  it("se puede agendar el seguimiento junto con un cambio de estado en la misma petición", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "Combo estado + seguimiento",
      email: `combo-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    const res = await adminClient.patch("/api/leads", {
      id: lead.id,
      status: "En Cotización",
      nextFollowUpAt: "2026-10-20",
    });
    expect(res.status).toBe(200);

    const row = await query("SELECT status, next_follow_up_at::text FROM leads WHERE id = $1;", [lead.id]);
    expect(row.rows[0].status).toBe("En Cotización");
    expect(row.rows[0].next_follow_up_at).toBe("2026-10-20");
  });
});

describe("DELETE /api/leads — borrado lógico", () => {
  it("borra el lead (deja de aparecer en la lista activa) y un segundo intento da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/leads", {
      name: "A borrar",
      email: `aborrar-${uniqueSuffix()}@test.local`,
      consent: true,
    });
    const { lead } = await createRes.json();

    const deleteRes = await adminClient.delete(`/api/leads?id=${lead.id}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await adminClient.get(`/api/leads?q=${encodeURIComponent(lead.email)}&status=ALL&page=1&pageSize=10`);
    const { total } = await listRes.json();
    expect(total).toBe(0);

    const secondDelete = await adminClient.delete(`/api/leads?id=${lead.id}`);
    expect(secondDelete.status).toBe(404);
  });
});
