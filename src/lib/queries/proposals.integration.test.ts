import { beforeEach, describe, expect, it } from "vitest";
import { getAllProposals, getProposalById } from "./proposals";
import { createTestProposal, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

// Formatea en fecha LOCAL, no UTC: `computeStatus` en proposals.ts compara
// contra `new Date().toDateString()` (local) — usar `toISOString()` acá
// desalinea el resultado varias horas al día según la zona horaria (ej.
// en UTC-5 después de las 7pm, "ayer" calculado vía ISO/UTC cae en el
// mismo día calendario que "hoy" local, no un día antes), lo que hacía
// este test intermitente según la hora a la que corriera.
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
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
