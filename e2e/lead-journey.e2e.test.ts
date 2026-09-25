import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs, uniqueSuffix } from "./helpers/client";
import { createTestCampaign, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

/**
 * Modela el recorrido de negocio completo de un lead, no solo cada
 * endpoint por separado (eso ya lo cubren leads.e2e.test.ts,
 * proposals.e2e.test.ts e invoices.e2e.test.ts). El valor de este archivo
 * es encadenar los mismos datos de un prospecto a través de los actores
 * reales que lo tocan: visitante público -> sales_manager -> cliente sin
 * cuenta -> de vuelta a sales_manager -> reporte ejecutivo (admin).
 */
describe("Recorrido de negocio: de lead a proyecto ganado", () => {
  it("visitante -> lead con atribución -> sales lo trabaja -> propuesta -> cliente acepta -> Ganado", async () => {
    // 1) Actor: visitante público del sitio, sin sesión. Llega desde una
    // campaña activa (mismo utm_campaign que ya existe en `campaigns`).
    const campaign = await createTestCampaign({ utmCampaign: `lanzamiento-${uniqueSuffix()}` });
    const email = `prospecto-${uniqueSuffix()}@test.local`;
    const publicVisitor = new TestClient();

    const leadRes = await publicVisitor.post("/api/leads", {
      name: "Prospecto Real",
      email,
      phone: "3001234567",
      service: "Plataforma de e-commerce",
      budget: "15000000",
      message: "Necesitamos una tienda en línea con pasarela de pagos.",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: campaign.utm_campaign,
    });
    expect(leadRes.status).toBe(200);
    const { lead } = await leadRes.json();
    expect(lead).toBeTruthy();

    const dbAfterCapture = await query("SELECT status, campaign_id FROM leads WHERE id = $1;", [lead.id]);
    expect(dbAfterCapture.rows[0].status).toBe("Nuevo");
    expect(dbAfterCapture.rows[0].campaign_id).toBe(campaign.id); // atribución automática por UTM

    // 2) Actor: sales_manager. Ve el lead nuevo en el CRM, se lo autoasigna
    // y dice que ya llamó, antes de pasarlo a cotización.
    const sales = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const salesClient = await loginAs(sales.email, "SuperSecret123456");

    const listRes = await salesClient.get(`/api/leads?q=${encodeURIComponent(email)}&status=ALL&page=1&pageSize=10`);
    const { leads: found } = await listRes.json();
    expect(found).toHaveLength(1);

    const assignRes = await salesClient.patch("/api/leads", { id: lead.id, ownerId: sales.id });
    expect(assignRes.status).toBe(200);

    await salesClient.post(`/api/leads/${lead.id}/activities`, {
      type: "call",
      body: "Llamada inicial: confirma presupuesto y alcance.",
    });

    const cotizacionRes = await salesClient.patch("/api/leads", { id: lead.id, status: "En Cotización" });
    expect(cotizacionRes.status).toBe(200);

    // 3) Actor: sales_manager convierte el lead en una propuesta formal.
    // No hay FK lead->proposal — el enlace de negocio es el mismo email,
    // el vendedor decide cuándo un lead está listo para cotizarse.
    const proposalRes = await salesClient.post("/api/proposals", {
      client_email: email,
      client_name: lead.name,
      title: "Plataforma de e-commerce",
      currency: "COP",
      tax_rate: 19,
      items: [
        { description: "Tienda en línea a medida", quantity: 1, unit_price: 12000000 },
        { description: "Integración pasarela de pagos", quantity: 1, unit_price: 2000000 },
      ],
    });
    expect(proposalRes.status).toBe(200);
    const { proposal } = await proposalRes.json();
    expect(proposal.status).toBe("sent");

    // 4) Actor: el cliente potencial, todavía sin cuenta — abre el enlace
    // público que le compartió ventas y acepta.
    const prospectClient = new TestClient();
    const viewRes = await prospectClient.get(`/api/proposals/${proposal.id}`);
    expect((await viewRes.json()).proposal.status).toBe("viewed");

    const acceptRes = await prospectClient.post(`/api/proposals/${proposal.id}/respond`, {
      action: "accept",
      signerName: "Prospecto de Prueba",
      consent: true,
    });
    expect(acceptRes.status).toBe(200);
    const accepted = await acceptRes.json();
    expect(accepted.projectId).toBeTruthy();

    const clientRow = await query("SELECT id FROM clients WHERE email = $1;", [email]);
    expect(clientRow.rows).toHaveLength(1);
    const projectRow = await query("SELECT client_id, status FROM projects WHERE id = $1;", [accepted.projectId]);
    expect(projectRow.rows[0].client_id).toBe(clientRow.rows[0].id);

    // 5) Actor: sales_manager cierra el ciclo marcando el lead como Ganado
    // — este paso es manual, el sistema no lo infiere solo porque se
    // aceptó una propuesta con el mismo correo.
    const wonRes = await salesClient.patch("/api/leads", { id: lead.id, status: "Ganado" });
    expect(wonRes.status).toBe(200);

    const activitiesRes = await salesClient.get(`/api/leads/${lead.id}/activities`);
    const { activities } = await activitiesRes.json();
    // 2 cambios de estado automáticos (Nuevo->En Cotización, En Cotización->Ganado) + 1 nota manual
    expect(activities).toHaveLength(3);
    expect(activities.filter((a: { type: string }) => a.type === "status_change")).toHaveLength(2);

    // 6) Actor: admin — ve el resultado agregado en el resumen ejecutivo.
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const statsRes = await adminClient.get("/api/leads?status=Ganado&page=1&pageSize=10");
    const { total: wonTotal } = await statsRes.json();
    expect(wonTotal).toBe(1);
  });

  it("lead que no prospera: se contacta, se cotiza y se marca Perdido sin crear cliente ni proyecto", async () => {
    const email = `perdido-${uniqueSuffix()}@test.local`;
    const publicVisitor = new TestClient();
    const leadRes = await publicVisitor.post("/api/leads", {
      name: "Prospecto Frío",
      email,
      service: "Landing page",
    });
    const { lead } = await leadRes.json();

    const sales = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const salesClient = await loginAs(sales.email, "SuperSecret123456");

    await salesClient.patch("/api/leads", { id: lead.id, ownerId: sales.id, status: "En Cotización" });
    await salesClient.post(`/api/leads/${lead.id}/activities`, {
      type: "email",
      body: "Se envió cotización por correo, sin respuesta en 2 semanas.",
    });
    const lostRes = await salesClient.patch("/api/leads", { id: lead.id, status: "Perdido" });
    expect(lostRes.status).toBe(200);

    const clientRow = await query("SELECT COUNT(*) FROM clients WHERE email = $1;", [email]);
    expect(Number(clientRow.rows[0].count)).toBe(0);

    const statsRes = await salesClient.get("/api/leads?status=Perdido&page=1&pageSize=10");
    const { total } = await statsRes.json();
    expect(total).toBe(1);
  });

  it("un traffiker no puede tocar leads ajenos a su rol (solo ve/gestiona campañas)", async () => {
    const publicVisitor = new TestClient();
    const leadRes = await publicVisitor.post("/api/leads", {
      name: "Prospecto Cualquiera",
      email: `x-${uniqueSuffix()}@test.local`,
    });
    const { lead } = await leadRes.json();

    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const trafClient = await loginAs(traffiker.email, "SuperSecret123456");

    const listRes = await trafClient.get("/api/leads?status=ALL&page=1&pageSize=10");
    expect(listRes.status).toBe(403);

    const patchRes = await trafClient.patch("/api/leads", { id: lead.id, status: "Ganado" });
    expect(patchRes.status).toBe(403);
  });
});
