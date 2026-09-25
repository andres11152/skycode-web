import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestInvoice, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("GET /api/invoices/[id]/pdf — extremo a extremo", () => {
  it("admin (invoices:read) descarga el PDF con el Content-Type y nombre correctos", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });

    const browser = await loginAs(admin.email, "SuperSecret123456");
    const res = await browser.get(`/api/invoices/${invoice.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain(invoice.invoice_number);

    const buffer = Buffer.from(await res.arrayBuffer());
    // Todo PDF válido empieza con la firma "%PDF-" — confirma que es un
    // documento real, no un error disfrazado de 200.
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("un cliente descarga el PDF de una factura de su propio proyecto", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id);

    const browser = await loginAs(clientUser.email, "SuperSecret123456");
    const res = await browser.get(`/api/invoices/${invoice.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("un cliente no puede descargar el PDF de la factura de otro cliente (404)", async () => {
    const ownClient = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: ownClient.id, password: "SuperSecret123456" });
    const otherClient = await createTestClient();
    const otherProject = await createTestProject(otherClient.id);
    const otherInvoice = await createTestInvoice(otherProject.id);

    const browser = await loginAs(clientUser.email, "SuperSecret123456");
    const res = await browser.get(`/api/invoices/${otherInvoice.id}/pdf`);
    expect(res.status).toBe(404);
  });

  it("traffiker (sin invoices:read) no puede descargar", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id);
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });

    const browser = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await browser.get(`/api/invoices/${invoice.id}/pdf`);
    expect(res.status).toBe(403);
  });

  it("una factura inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    const res = await browser.get("/api/invoices/999999/pdf");
    expect(res.status).toBe(404);
  });
});
