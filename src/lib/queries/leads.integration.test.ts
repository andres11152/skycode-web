import { beforeEach, describe, expect, it } from "vitest";
import {
  addLeadActivity,
  anonymizeLead,
  createLead,
  getActiveLeadsPage,
  getAllMatchingLeads,
  getLeadActivities,
  getLeadStats,
  setLeadFollowUp,
  softDeleteLead,
  updateLeadStatusAndOwner,
} from "./leads";
import { query } from "../db";
import { createTestCampaign, createTestLead, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getActiveLeadsPage", () => {
  it("excluye leads borrados lógicamente", async () => {
    await createTestLead({ name: "Visible" });
    await createTestLead({ name: "Borrado", deletedAt: new Date() });

    const { leads, total } = await getActiveLeadsPage({ q: "", status: "ALL", page: 1, pageSize: 10 });

    expect(total).toBe(1);
    expect(leads.map((l) => l.name)).toEqual(["Visible"]);
  });

  it("filtra por búsqueda (nombre, email o servicio) usando ILIKE", async () => {
    await createTestLead({ name: "Andrés Caicedo", email: "andres@example.com", service: "Sitio Web" });
    await createTestLead({ name: "Otro Lead", email: "otro@example.com", service: "App Móvil" });

    const byName = await getActiveLeadsPage({ q: "andrés", status: "ALL", page: 1, pageSize: 10 });
    expect(byName.total).toBe(1);
    expect(byName.leads[0].name).toBe("Andrés Caicedo");

    const byService = await getActiveLeadsPage({ q: "móvil", status: "ALL", page: 1, pageSize: 10 });
    expect(byService.total).toBe(1);
    expect(byService.leads[0].name).toBe("Otro Lead");
  });

  it("filtra por estado exacto", async () => {
    await createTestLead({ status: "Nuevo" });
    await createTestLead({ status: "Ganado" });
    await createTestLead({ status: "Ganado" });

    const won = await getActiveLeadsPage({ q: "", status: "Ganado", page: 1, pageSize: 10 });
    expect(won.total).toBe(2);
    expect(won.leads.every((l) => l.status === "Ganado")).toBe(true);
  });

  it("pagina correctamente y ordena por más reciente primero", async () => {
    await createTestLead({ name: "Primero", createdAt: new Date("2026-01-01T00:00:00Z") });
    await createTestLead({ name: "Segundo", createdAt: new Date("2026-01-02T00:00:00Z") });
    await createTestLead({ name: "Tercero", createdAt: new Date("2026-01-03T00:00:00Z") });

    const page1 = await getActiveLeadsPage({ q: "", status: "ALL", page: 1, pageSize: 2 });
    expect(page1.total).toBe(3);
    expect(page1.leads.map((l) => l.name)).toEqual(["Tercero", "Segundo"]);

    const page2 = await getActiveLeadsPage({ q: "", status: "ALL", page: 2, pageSize: 2 });
    expect(page2.leads.map((l) => l.name)).toEqual(["Primero"]);
  });

  it("incluye el dueño (owner) enlazado cuando existe, y null si no", async () => {
    const owner = await createTestUser({ name: "Vendedor", role: "sales_manager" });
    await createTestLead({ name: "Con dueño", ownerId: owner.id });
    await createTestLead({ name: "Sin dueño" });

    const { leads } = await getActiveLeadsPage({ q: "", status: "ALL", page: 1, pageSize: 10 });
    const withOwner = leads.find((l) => l.name === "Con dueño");
    const withoutOwner = leads.find((l) => l.name === "Sin dueño");

    expect(withOwner?.owner).toEqual({ id: owner.id, name: "Vendedor", email: owner.email });
    expect(withoutOwner?.owner).toBeNull();
  });
});

describe("getAllMatchingLeads", () => {
  it("devuelve todos los que calzan el filtro, sin paginar", async () => {
    for (let i = 0; i < 25; i++) {
      await createTestLead({ name: `Lead ${i}` });
    }
    const all = await getAllMatchingLeads({ q: "", status: "ALL" });
    expect(all).toHaveLength(25);
  });

  it("respeta el mismo filtro de estado y búsqueda que la versión paginada", async () => {
    await createTestLead({ name: "Match", status: "Ganado" });
    await createTestLead({ name: "No Match", status: "Nuevo" });

    const result = await getAllMatchingLeads({ q: "", status: "Ganado" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Match");
  });
});

describe("getLeadStats", () => {
  it("cuenta total, nuevos y ganados ignorando el filtro de búsqueda/estado y los borrados", async () => {
    await createTestLead({ status: "Nuevo" });
    await createTestLead({ status: "Nuevo" });
    await createTestLead({ status: "Ganado" });
    await createTestLead({ status: "Perdido" });
    await createTestLead({ status: "Nuevo", deletedAt: new Date() });

    const stats = await getLeadStats();
    expect(stats.total).toBe(4);
    expect(stats.newCount).toBe(2);
    expect(stats.wonCount).toBe(1);
  });
});

describe("getLeadActivities", () => {
  it("devuelve las actividades de un lead ordenadas de más reciente a más antigua", async () => {
    const lead = await createTestLead();
    await query(
      `INSERT INTO lead_activities (lead_id, actor_name, type, body, created_at) VALUES ($1,$2,$3,$4,$5);`,
      [lead.id, "Ana", "note", "Primera nota", new Date("2026-01-01T00:00:00Z")]
    );
    await query(
      `INSERT INTO lead_activities (lead_id, actor_name, type, body, created_at) VALUES ($1,$2,$3,$4,$5);`,
      [lead.id, "Ana", "call", "Llamada de seguimiento", new Date("2026-01-02T00:00:00Z")]
    );

    const activities = await getLeadActivities(lead.id);
    expect(activities).toHaveLength(2);
    expect(activities[0].body).toBe("Llamada de seguimiento");
    expect(activities[1].body).toBe("Primera nota");
  });

  it("devuelve un arreglo vacío para un lead sin actividades", async () => {
    const lead = await createTestLead();
    const activities = await getLeadActivities(lead.id);
    expect(activities).toEqual([]);
  });
});

describe("createLead", () => {
  it("inserta el lead con status 'Nuevo' y los valores por defecto documentados", async () => {
    const created = await createLead({ name: "Prospecto", email: "PROSPECTO@Example.com" });

    const res = await query("SELECT * FROM leads WHERE id = $1;", [created.id]);
    const row = res.rows[0];
    expect(row.email).toBe("prospecto@example.com"); // normalizado a minúsculas
    expect(row.status).toBe("Nuevo");
    // Sin `service`/`source` explícitos, quedan NULL — nunca un valor
    // inventado (bug real corregido: antes caían a literales fijos como
    // "Desarrollo General"/"Sitio Web Directo" que sugerían una selección
    // que nunca ocurrió, ver db/migrations/0020_normalize_lead_service.sql).
    expect(row.service).toBeNull();
    expect(row.budget).toBe("A convenir");
    expect(row.currency).toBe("COP");
    expect(row.estimated_weeks).toBe(4);
    expect(row.source).toBeNull();
  });

  it("enlaza automáticamente el lead a una campaña existente cuyo utm_campaign calza", async () => {
    const campaign = await createTestCampaign({ utmCampaign: "verano-2026" });

    const created = await createLead({ name: "Con campaña", email: "conc@example.com", utm_campaign: "verano-2026" });

    const res = await query("SELECT campaign_id FROM leads WHERE id = $1;", [created.id]);
    expect(res.rows[0].campaign_id).toBe(campaign.id);
  });

  it("si el utm_campaign no calza con ninguna campaña registrada, campaign_id queda null (no falla)", async () => {
    const created = await createLead({ name: "Sin match", email: "sinmatch@example.com", utm_campaign: "no-existe" });

    const res = await query("SELECT campaign_id FROM leads WHERE id = $1;", [created.id]);
    expect(res.rows[0].campaign_id).toBeNull();
  });

  it("no enlaza a una campaña borrada lógicamente aunque el utm_campaign calce", async () => {
    await createTestCampaign({ utmCampaign: "campana-vieja", deletedAt: new Date() });

    const created = await createLead({ name: "X", email: "x@example.com", utm_campaign: "campana-vieja" });

    const res = await query("SELECT campaign_id FROM leads WHERE id = $1;", [created.id]);
    expect(res.rows[0].campaign_id).toBeNull();
  });
});

describe("updateLeadStatusAndOwner", () => {
  it("actualiza solo el estado cuando no se pasa ownerId ni campaignId", async () => {
    const owner = await createTestUser({ role: "sales_manager" });
    const lead = await createTestLead({ status: "Nuevo", ownerId: owner.id });

    const result = await updateLeadStatusAndOwner({ id: lead.id, status: "Contactado" }, { query });

    expect(result?.before.status).toBe("Nuevo");
    expect(result?.after.status).toBe("Contactado");
    expect(result?.after.owner_id).toBe(owner.id); // sin tocar
  });

  it("permite reasignar el dueño a null explícitamente (desasignar)", async () => {
    const owner = await createTestUser({ role: "sales_manager" });
    const lead = await createTestLead({ ownerId: owner.id });

    const result = await updateLeadStatusAndOwner({ id: lead.id, ownerId: null }, { query });

    expect(result?.after.owner_id).toBeNull();
  });

  it("distingue entre 'no tocar' (undefined) y 'poner en null' para ownerId/campaignId", async () => {
    const owner = await createTestUser({ role: "sales_manager" });
    const campaign = await createTestCampaign();
    const lead = await createTestLead({ ownerId: owner.id, campaignId: campaign.id });

    // No se pasa ninguno de los dos: deben quedar intactos.
    const result = await updateLeadStatusAndOwner({ id: lead.id, status: "Ganado" }, { query });

    expect(result?.after.owner_id).toBe(owner.id);
    expect(result?.after.campaign_id).toBe(campaign.id);
  });

  it("devuelve null para un lead borrado lógicamente o inexistente", async () => {
    const deletedLead = await createTestLead({ deletedAt: new Date() });

    const result = await updateLeadStatusAndOwner({ id: deletedLead.id, status: "Ganado" }, { query });
    expect(result).toBeNull();

    const missing = await updateLeadStatusAndOwner({ id: 999999, status: "Ganado" }, { query });
    expect(missing).toBeNull();
  });
});

describe("softDeleteLead", () => {
  it("marca deleted_at y ya no aparece en las consultas activas", async () => {
    const lead = await createTestLead();

    const deleted = await softDeleteLead(lead.id, { query });
    expect(deleted?.id).toBe(lead.id);

    const { total } = await getActiveLeadsPage({ q: "", status: "ALL", page: 1, pageSize: 10 });
    expect(total).toBe(0);
  });

  it("devuelve null si el lead ya estaba borrado (no re-borra)", async () => {
    const lead = await createTestLead({ deletedAt: new Date() });
    const result = await softDeleteLead(lead.id, { query });
    expect(result).toBeNull();
  });
});

describe("addLeadActivity", () => {
  it("registra la actividad y la devuelve con su id y fecha", async () => {
    const lead = await createTestLead();

    const activity = await addLeadActivity({
      leadId: lead.id,
      actorId: null,
      actorName: "Sistema",
      type: "note",
      body: "Nota automática",
    });

    expect(activity).not.toBeNull();
    expect(activity?.type).toBe("note");
    expect(activity?.body).toBe("Nota automática");

    const activities = await getLeadActivities(lead.id);
    expect(activities).toHaveLength(1);
  });

  it("devuelve null si el lead no existe o está borrado (no crea una actividad huérfana)", async () => {
    const deletedLead = await createTestLead({ deletedAt: new Date() });

    const activity = await addLeadActivity({
      leadId: deletedLead.id,
      actorName: "Sistema",
      type: "note",
      body: "No debería crearse",
    });

    expect(activity).toBeNull();
    const res = await query("SELECT COUNT(*) FROM lead_activities WHERE lead_id = $1;", [deletedLead.id]);
    expect(Number(res.rows[0].count)).toBe(0);
  });
});

describe("setLeadFollowUp", () => {
  it("agenda una fecha y una nota", async () => {
    const lead = await createTestLead();

    const result = await setLeadFollowUp({ id: lead.id, nextFollowUpAt: "2026-10-15", followUpNote: "Llamar en la tarde" }, { query });

    expect(result).not.toBeNull();
    const row = await query("SELECT next_follow_up_at::text, follow_up_note FROM leads WHERE id = $1;", [lead.id]);
    expect(row.rows[0].next_follow_up_at).toBe("2026-10-15");
    expect(row.rows[0].follow_up_note).toBe("Llamar en la tarde");
  });

  it("nextFollowUpAt: null borra el recordatorio", async () => {
    const lead = await createTestLead();
    await setLeadFollowUp({ id: lead.id, nextFollowUpAt: "2026-10-15", followUpNote: "x" }, { query });

    await setLeadFollowUp({ id: lead.id, nextFollowUpAt: null, followUpNote: null }, { query });

    const row = await query("SELECT next_follow_up_at, follow_up_note FROM leads WHERE id = $1;", [lead.id]);
    expect(row.rows[0].next_follow_up_at).toBeNull();
    expect(row.rows[0].follow_up_note).toBeNull();
  });

  it("reprogramar la fecha reinicia follow_up_notified_at a NULL (para que vuelva a avisar en la fecha nueva)", async () => {
    const lead = await createTestLead();
    await setLeadFollowUp({ id: lead.id, nextFollowUpAt: "2026-10-15", followUpNote: null }, { query });
    await query("UPDATE leads SET follow_up_notified_at = now() WHERE id = $1;", [lead.id]);

    await setLeadFollowUp({ id: lead.id, nextFollowUpAt: "2026-11-01", followUpNote: null }, { query });

    const row = await query("SELECT follow_up_notified_at FROM leads WHERE id = $1;", [lead.id]);
    expect(row.rows[0].follow_up_notified_at).toBeNull();
  });

  it("devuelve null para un lead que no existe o está borrado", async () => {
    expect(await setLeadFollowUp({ id: 999999, nextFollowUpAt: "2026-10-15", followUpNote: null }, { query })).toBeNull();

    const deletedLead = await createTestLead({ deletedAt: new Date() });
    expect(await setLeadFollowUp({ id: deletedLead.id, nextFollowUpAt: "2026-10-15", followUpNote: null }, { query })).toBeNull();
  });
});

// Derecho al olvido (Ley 1581) para prospectos que nunca llegaron a ser
// clientes — ver migración 0035 y el comentario largo en anonymizeLead.
describe("anonymizeLead", () => {
  it("reemplaza nombre/email/telefono/mensaje por valores genéricos y marca anonymized_at", async () => {
    const lead = await createTestLead({ name: "Andrés Real", email: "andres.real@example.com", phone: "+573001112233", message: "Necesito un CRM a medida" });

    const result = await anonymizeLead(lead.id, { query });
    expect(result).toEqual({ outcome: "ok" });

    const row = await query("SELECT name, email, phone, message, anonymized_at FROM leads WHERE id = $1;", [lead.id]);
    const updated = row.rows[0];
    expect(updated.name).toBe(`Prospecto Eliminado #${lead.id}`);
    expect(updated.email).toBe(`prospecto-eliminado-${lead.id}@anonimizado.local`);
    expect(updated.phone).toBeNull();
    expect(updated.message).toBe("");
    expect(updated.anonymized_at).not.toBeNull();
  });

  it("es idempotente: devuelve already_anonymized en el segundo intento", async () => {
    const lead = await createTestLead();
    await anonymizeLead(lead.id, { query });

    const second = await anonymizeLead(lead.id, { query });
    expect(second).toEqual({ outcome: "already_anonymized" });
  });

  it("devuelve not_found para un lead que no existe o ya está borrado lógicamente", async () => {
    expect(await anonymizeLead(999999, { query })).toEqual({ outcome: "not_found" });

    const deletedLead = await createTestLead({ deletedAt: new Date() });
    expect(await anonymizeLead(deletedLead.id, { query })).toEqual({ outcome: "not_found" });
  });
});
