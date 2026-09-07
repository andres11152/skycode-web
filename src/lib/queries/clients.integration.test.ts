import { beforeEach, describe, expect, it } from "vitest";
import { getClientsPage, getClientDetail, updateClient } from "./clients";
import { query } from "../db";
import {
  createTestClient,
  createTestProject,
  createTestProposal,
  createTestInvoice,
  createTestPayment,
  resetTestDb,
} from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getClientsPage", () => {
  it("agrega proyectos, facturado y saldo pendiente convertidos a COP", async () => {
    const client = await createTestClient({ name: "Acme", email: "acme@test.local" });
    const project = await createTestProject(client.id, { title: "Sitio Web" });
    // Factura en COP: 1,000,000 con 400,000 pagados -> 600,000 pendiente.
    const invoiceCop = await createTestInvoice(project.id, { amount: 1_000_000, currency: "COP" });
    await createTestPayment(invoiceCop.id, { amount: 400_000 });
    // Factura en USD: 100 sin pagos, tasa 4000 -> 400,000 COP facturado y pendiente.
    await createTestInvoice(project.id, { amount: 100, currency: "USD" });

    const { clients, total } = await getClientsPage({ q: "", page: 1, pageSize: 10, usdToCopRate: 4000 });

    expect(total).toBe(1);
    expect(clients).toHaveLength(1);
    expect(clients[0].projectCount).toBe(1);
    // 1,000,000 (COP) + 100*4000 (USD->COP) = 1,400,000 facturado.
    expect(clients[0].totalBilledCop).toBe(1_400_000);
    // 600,000 (COP pendiente) + 400,000 (USD pendiente) = 1,000,000.
    expect(clients[0].totalOutstandingCop).toBe(1_000_000);
  });

  it("filtra por nombre, correo o empresa (q)", async () => {
    await createTestClient({ name: "Acme Corp", email: "acme@test.local" });
    await createTestClient({ name: "Otra Empresa", email: "otra@test.local" });

    const { clients, total } = await getClientsPage({ q: "acme", page: 1, pageSize: 10, usdToCopRate: 4000 });
    expect(total).toBe(1);
    expect(clients[0].name).toBe("Acme Corp");
  });

  it("pagina correctamente", async () => {
    for (let i = 0; i < 3; i++) {
      await createTestClient({ name: `Cliente ${i}`, email: `cliente${i}@test.local` });
    }

    const page1 = await getClientsPage({ q: "", page: 1, pageSize: 2, usdToCopRate: 4000 });
    expect(page1.clients).toHaveLength(2);
    expect(page1.total).toBe(3);

    const page2 = await getClientsPage({ q: "", page: 2, pageSize: 2, usdToCopRate: 4000 });
    expect(page2.clients).toHaveLength(1);
  });
});

describe("getClientDetail", () => {
  it("devuelve null si el cliente no existe", async () => {
    const detail = await getClientDetail(999999, 4000);
    expect(detail).toBeNull();
  });

  it("cruza proyectos, propuestas (por email) y facturas del cliente", async () => {
    const client = await createTestClient({ name: "Acme", email: "acme@test.local" });
    const project = await createTestProject(client.id, { title: "Sitio Web" });
    await createTestInvoice(project.id, { amount: 500_000, currency: "COP" });
    await createTestProposal({ clientEmail: "acme@test.local", clientName: "Acme", title: "Propuesta Inicial" });
    // Propuesta de OTRO cliente — no debe aparecer en la ficha de Acme.
    await createTestProposal({ clientEmail: "otro@test.local", clientName: "Otro", title: "Propuesta Ajena" });

    const detail = await getClientDetail(client.id, 4000);

    expect(detail).not.toBeNull();
    expect(detail!.projects).toHaveLength(1);
    expect(detail!.projects[0].title).toBe("Sitio Web");
    expect(detail!.proposals).toHaveLength(1);
    expect(detail!.proposals[0].title).toBe("Propuesta Inicial");
    expect(detail!.invoices).toHaveLength(1);
    expect(detail!.totalBilledCop).toBe(500_000);
    expect(detail!.totalOutstandingCop).toBe(500_000);
  });
});

describe("updateClient", () => {
  it("actualiza los campos de contacto sin tocar el email", async () => {
    const client = await createTestClient({ name: "Acme", email: "acme@test.local" });

    const result = await updateClient(client.id, { name: "Acme Corp", company: "Acme Inc." }, { query });

    expect(result).not.toBeNull();
    expect(result!.after.name).toBe("Acme Corp");
    expect(result!.after.company).toBe("Acme Inc.");
    expect(result!.after.email).toBe("acme@test.local");
  });

  it("devuelve null si el cliente no existe", async () => {
    const result = await updateClient(999999, { name: "X" }, { query });
    expect(result).toBeNull();
  });
});
