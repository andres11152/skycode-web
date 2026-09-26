import { beforeEach, describe, expect, it } from "vitest";
import { exportClientData, anonymizeClient } from "./dataPrivacy";
import { query, withTransaction } from "../db";
import {
  createTestClient,
  createTestProject,
  createTestUser,
  createTestInvoice,
  createTestLead,
  createTestPayment,
  createTestProposal,
  createTestSession,
  resetTestDb,
} from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("exportClientData", () => {
  it("devuelve null si el cliente no existe", async () => {
    const result = await exportClientData(999999);
    expect(result).toBeNull();
  });

  it("agrega todos los datos vinculados a un cliente", async () => {
    const client = await createTestClient({ name: "Cliente Export", email: "export@test.local" });
    const project = await createTestProject(client.id, { title: "Proyecto Export" });
    const invoice = await createTestInvoice(project.id, { amount: 2000 });
    await createTestPayment(invoice.id, { amount: 500 });
    await createTestProposal({ clientEmail: client.email, clientName: client.name, title: "Propuesta Export" });

    const result = await exportClientData(client.id);
    expect(result).not.toBeNull();
    const data = result as Record<string, unknown>;

    expect((data.client as { name: string }).name).toBe("Cliente Export");
    expect(data.projects).toHaveLength(1);
    expect((data.projects as { title: string }[])[0].title).toBe("Proyecto Export");
    expect(data.invoices).toHaveLength(1);
    expect(data.payments).toHaveLength(1);
    expect(data.proposals).toHaveLength(1);
    expect((data.proposals as { title: string }[])[0].title).toBe("Propuesta Export");
    expect(data.leads).toEqual([]);
    expect(data.retainers).toEqual([]);
    expect(typeof data.exportedAt).toBe("string");
  });

  it("no incluye datos de otro cliente", async () => {
    const client = await createTestClient({ email: "a@test.local" });
    const otherClient = await createTestClient({ email: "b@test.local" });
    await createTestProject(otherClient.id, { title: "No debería aparecer" });

    const result = await exportClientData(client.id);
    const data = result as Record<string, unknown>;
    expect(data.projects).toEqual([]);
  });
});

describe("anonymizeClient", () => {
  it("devuelve not_found si el cliente no existe", async () => {
    const result = await withTransaction((c) => anonymizeClient(999999, c));
    expect(result).toEqual({ outcome: "not_found" });
  });

  it("reemplaza nombre/email/telefono/notas del cliente", async () => {
    const client = await createTestClient({ name: "Cliente Real", email: "real@test.local" });
    await query(`UPDATE clients SET phone = $1, company = $2, notes = $3 WHERE id = $4;`, [
      "+573000000000",
      "Empresa Real",
      "notas sensibles",
      client.id,
    ]);

    const result = await withTransaction((c) => anonymizeClient(client.id, c));
    expect(result).toEqual({ outcome: "ok" });

    const row = await query(`SELECT name, email, phone, company, notes, anonymized_at FROM clients WHERE id = $1;`, [client.id]);
    expect(row.rows[0].name).toBe(`Cliente Eliminado #${client.id}`);
    expect(row.rows[0].email).toBe(`cliente-eliminado-${client.id}@anonimizado.local`);
    expect(row.rows[0].phone).toBeNull();
    expect(row.rows[0].company).toBeNull();
    expect(row.rows[0].notes).toBe("");
    expect(row.rows[0].anonymized_at).not.toBeNull();
  });

  it("anonimiza al usuario portal del cliente y revoca sus sesiones", async () => {
    const client = await createTestClient({ email: "portal@test.local" });
    const portalUser = await createTestUser({ role: "client", clientId: client.id, name: "Usuario Portal" });
    const session = await createTestSession(portalUser.id);

    const result = await withTransaction((c) => anonymizeClient(client.id, c));
    expect(result).toEqual({ outcome: "ok" });

    const userRow = await query(`SELECT name, email, status FROM users WHERE id = $1;`, [portalUser.id]);
    expect(userRow.rows[0].status).toBe("disabled");
    expect(userRow.rows[0].email).toBe(`usuario-eliminado-${portalUser.id}@anonimizado.local`);

    const sessionRow = await query(`SELECT revoked_at FROM sessions WHERE id = $1;`, [session.id]);
    expect(sessionRow.rows[0].revoked_at).not.toBeNull();
  });

  it("anonimiza las propuestas asociadas por email", async () => {
    const client = await createTestClient({ name: "Cliente Prop", email: "prop@test.local" });
    await createTestProposal({ clientEmail: client.email, clientName: client.name });

    await withTransaction((c) => anonymizeClient(client.id, c));

    const propRow = await query(`SELECT client_name, client_email FROM proposals WHERE lower(client_email) NOT IN ($1);`, [
      "prop@test.local",
    ]);
    expect(propRow.rows).toHaveLength(1);
    expect(propRow.rows[0].client_name).toBe(`Cliente Eliminado #${client.id}`);
  });

  it("anonimiza también los leads asociados por email (el lead original antes de convertirse en cliente)", async () => {
    const client = await createTestClient({ name: "Cliente Lead", email: "lead-origen@test.local" });
    const lead = await createTestLead({ name: "Cliente Lead", email: "lead-origen@test.local", phone: "+573009998877" });
    const otherLead = await createTestLead({ name: "Otro Lead", email: "otro-sin-relacion@test.local" });

    await withTransaction((c) => anonymizeClient(client.id, c));

    const leadRow = await query("SELECT name, email, phone, anonymized_at FROM leads WHERE id = $1;", [lead.id]);
    expect(leadRow.rows[0].name).toBe(`Cliente Eliminado #${client.id}`);
    expect(leadRow.rows[0].phone).toBeNull();
    expect(leadRow.rows[0].anonymized_at).not.toBeNull();

    // Un lead sin relación por email no debe tocarse.
    const otherRow = await query("SELECT name, anonymized_at FROM leads WHERE id = $1;", [otherLead.id]);
    expect(otherRow.rows[0].name).toBe("Otro Lead");
    expect(otherRow.rows[0].anonymized_at).toBeNull();
  });

  it("es idempotente: devuelve already_anonymized en el segundo intento", async () => {
    const client = await createTestClient();
    const first = await withTransaction((c) => anonymizeClient(client.id, c));
    expect(first).toEqual({ outcome: "ok" });

    const second = await withTransaction((c) => anonymizeClient(client.id, c));
    expect(second).toEqual({ outcome: "already_anonymized" });
  });

  it("conserva proyectos y facturas intactos (solo se anonimiza identidad)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { title: "Proyecto Intacto" });
    const invoice = await createTestInvoice(project.id, { amount: 3000 });

    await withTransaction((c) => anonymizeClient(client.id, c));

    const projectRow = await query(`SELECT title FROM projects WHERE id = $1;`, [project.id]);
    expect(projectRow.rows[0].title).toBe("Proyecto Intacto");
    const invoiceRow = await query(`SELECT amount FROM invoices WHERE id = $1;`, [invoice.id]);
    expect(Number(invoiceRow.rows[0].amount)).toBe(3000);
  });
});
