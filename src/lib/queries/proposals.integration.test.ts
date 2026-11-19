import { beforeEach, describe, expect, it } from "vitest";
import { getAllProposals, getProposalById, acceptProposalAndCreateProject, rejectProposal, ProposalAlreadyRespondedError } from "./proposals";
import { query, withTransaction } from "../db";
import { createTestProposal, resetTestDb } from "../testHelpers/db";
import { todayBogota } from "../dateOnly";

beforeEach(async () => {
  await resetTestDb();
});

// "Ayer" y "mañana" en la fecha de BOGOTÁ, la misma que usa `computeStatus` (vía `isBeforeToday` de
// lib/dateOnly). Antes se formateaban en la fecha local del proceso: el runner de CI está en UTC, y entre
// las 19:00 y la medianoche de Bogotá "ayer" en UTC es "hoy" en Bogotá, así que la propuesta no figuraba
// vencida y el test fallaba según la hora del push (fallo real en CI, nov. 2026).
function bogotaDayOffset(days: number): string {
  const d = new Date(`${todayBogota()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function yesterday(): string {
  return bogotaDayOffset(-1);
}

function tomorrow(): string {
  return bogotaDayOffset(1);
}

describe("getAllProposals / getProposalById — status derivado", () => {
  it("sin viewed/accepted/rejected y sin vencer: status = sent", async () => {
    const proposal = await createTestProposal({ validUntil: tomorrow() });
    const found = await getProposalById(proposal.id);
    expect(found?.status).toBe("sent");
  });

  it("con viewed_at pero sin decisión: status = viewed", async () => {
    const proposal = await createTestProposal({ viewedAt: new Date(), validUntil: tomorrow() });
    const found = await getProposalById(proposal.id);
    expect(found?.status).toBe("viewed");
  });

  it("con accepted_at: status = accepted, sin importar si venció", async () => {
    const proposal = await createTestProposal({ acceptedAt: new Date(), validUntil: yesterday() });
    const found = await getProposalById(proposal.id);
    expect(found?.status).toBe("accepted");
  });

  it("con rejected_at: status = rejected", async () => {
    const proposal = await createTestProposal({ rejectedAt: new Date() });
    const found = await getProposalById(proposal.id);
    expect(found?.status).toBe("rejected");
  });

  it("valid_until en el pasado sin decisión: status = expired", async () => {
    const proposal = await createTestProposal({ validUntil: yesterday() });
    const found = await getProposalById(proposal.id);
    expect(found?.status).toBe("expired");
  });

  it("rejected_at tiene prioridad sobre expired si ambos aplican", async () => {
    const proposal = await createTestProposal({ validUntil: yesterday(), rejectedAt: new Date() });
    const found = await getProposalById(proposal.id);
    expect(found?.status).toBe("rejected");
  });
});

describe("getProposalById — totales", () => {
  it("calcula subtotal y total con impuesto a partir de los ítems", async () => {
    const proposal = await createTestProposal({
      taxRate: 19,
      items: [
        { description: "Diseño", quantity: 1, unitPrice: 1000 },
        { description: "Desarrollo", quantity: 2, unitPrice: 500 },
      ],
    });

    const found = await getProposalById(proposal.id);
    expect(found?.subtotal).toBe(2000);
    expect(found?.total).toBeCloseTo(2380, 5); // 2000 * 1.19
  });

  it("respeta la cantidad de ítems y su orden de inserción", async () => {
    const proposal = await createTestProposal({
      items: [
        { description: "Primero", unitPrice: 100 },
        { description: "Segundo", unitPrice: 200 },
      ],
    });

    const found = await getProposalById(proposal.id);
    expect(found?.items.map((i) => i.description)).toEqual(["Primero", "Segundo"]);
  });

  it("devuelve null para un UUID que no existe (acceso público por posesión del enlace)", async () => {
    const found = await getProposalById("00000000-0000-0000-0000-000000000000");
    expect(found).toBeNull();
  });
});

describe("getAllProposals", () => {
  it("devuelve todas las propuestas ordenadas por más reciente primero", async () => {
    await createTestProposal({ title: "Vieja" });
    await createTestProposal({ title: "Nueva" });

    const proposals = await getAllProposals();
    expect(proposals).toHaveLength(2);
    expect(proposals.map((p) => p.title)).toContain("Vieja");
    expect(proposals.map((p) => p.title)).toContain("Nueva");
  });

  it("cada propuesta trae sus propios ítems, sin mezclarse con los de otra", async () => {
    await createTestProposal({ title: "A", items: [{ description: "Solo de A", unitPrice: 1 }] });
    await createTestProposal({ title: "B", items: [{ description: "Solo de B", unitPrice: 1 }] });

    const proposals = await getAllProposals();
    const a = proposals.find((p) => p.title === "A");
    const b = proposals.find((p) => p.title === "B");
    expect(a?.items.map((i) => i.description)).toEqual(["Solo de A"]);
    expect(b?.items.map((i) => i.description)).toEqual(["Solo de B"]);
  });
});


describe("responder una propuesta — atómico", () => {
  const signature = { signerName: "Cliente Test", ip: null, userAgent: null };

  it("dos aceptaciones simultáneas crean un solo proyecto", async () => {
    const created = await createTestProposal();
    const proposal = await getProposalById(created.id);
    if (!proposal) throw new Error("propuesta de prueba no encontrada");

    const attempts = await Promise.allSettled([
      withTransaction((c) => acceptProposalAndCreateProject(proposal, c, signature)),
      withTransaction((c) => acceptProposalAndCreateProject(proposal, c, signature)),
    ]);

    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((a) => a.status === "rejected");
    expect(rejected && rejected.status === "rejected" && rejected.reason).toBeInstanceOf(ProposalAlreadyRespondedError);

    const projects = await query("SELECT id FROM projects;");
    expect(projects.rows).toHaveLength(1);
  });

  it("no se puede rechazar una propuesta ya aceptada", async () => {
    const created = await createTestProposal();
    const proposal = await getProposalById(created.id);
    if (!proposal) throw new Error("propuesta de prueba no encontrada");
    await withTransaction((c) => acceptProposalAndCreateProject(proposal, c, signature));

    await expect(withTransaction((c) => rejectProposal(created.id, c))).rejects.toBeInstanceOf(ProposalAlreadyRespondedError);
    const row = await query("SELECT rejected_at FROM proposals WHERE id = $1;", [created.id]);
    expect(row.rows[0].rejected_at).toBeNull();
  });
});
