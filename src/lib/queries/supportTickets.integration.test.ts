import { beforeEach, describe, expect, it } from "vitest";
import { createTicket, getAllTickets, getClientTickets, isProjectOwnedByClient, getTicketById, updateTicket, recalculateTicketSla } from "./supportTickets";
import { query, withTransaction } from "../db";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createTicket / getAllTickets", () => {
  it("crea un ticket con SLA calculado según prioridad", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    const before = Date.now();
    const ticketId = await createTicket(
      { project_id: project.id, title: "Error 500 en checkout", priority: "Urgente" },
      user.id,
      { query }
    );

    const ticket = await getTicketById(ticketId);
    expect(ticket).not.toBeNull();
    expect(ticket!.priority).toBe("Urgente");
    expect(ticket!.status).toBe("Abierto");

    // Urgente = 4 horas de ventana.
    const dueMs = new Date(ticket!.sla_due_at).getTime();
    const expectedMs = before + 4 * 60 * 60 * 1000;
    expect(Math.abs(dueMs - expectedMs)).toBeLessThan(5000);
  });

  it("usa prioridad Media por defecto si no se especifica", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query });

    const ticket = await getTicketById(ticketId);
    expect(ticket!.priority).toBe("Media");
  });

  it("trae el título del proyecto y el nombre del cliente por JOIN", async () => {
    const client = await createTestClient({ name: "Acme Corp" });
    const project = await createTestProject(client.id, { title: "Sitio Corporativo" });
    const user = await createTestUser();
    await createTicket({ project_id: project.id, title: "T" }, user.id, { query });

    const tickets = await getAllTickets();
    expect(tickets).toHaveLength(1);
    expect(tickets[0].project_title).toBe("Sitio Corporativo");
    expect(tickets[0].client_name).toBe("Acme Corp");
  });

  it("getAllTickets ordena por vencimiento de SLA ascendente (más urgente primero)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    await createTicket({ project_id: project.id, title: "Baja prioridad", priority: "Baja" }, user.id, { query });
    await createTicket({ project_id: project.id, title: "Urgente", priority: "Urgente" }, user.id, { query });
    await createTicket({ project_id: project.id, title: "Media", priority: "Media" }, user.id, { query });

    const tickets = await getAllTickets();
    expect(tickets.map((t) => t.title)).toEqual(["Urgente", "Media", "Baja prioridad"]);
  });

  it("no devuelve tickets borrados", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query });
    await query(`UPDATE support_tickets SET deleted_at = now() WHERE id = $1;`, [ticketId]);

    expect(await getAllTickets()).toHaveLength(0);
  });
});

describe("updateTicket", () => {
  it("marcar Resuelto setea resolved_at; volver a Abierto lo limpia", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query });

    await withTransaction((c) => updateTicket(ticketId, { status: "Resuelto" }, c));
    const resolved = await getTicketById(ticketId);
    expect(resolved!.resolved_at).not.toBeNull();
    expect(resolved!.closed_at).toBeNull();

    await withTransaction((c) => updateTicket(ticketId, { status: "Abierto" }, c));
    const reopened = await getTicketById(ticketId);
    expect(reopened!.resolved_at).toBeNull();
  });

  it("marcar Cerrado setea tanto resolved_at como closed_at", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query });

    await withTransaction((c) => updateTicket(ticketId, { status: "Cerrado" }, c));
    const closed = await getTicketById(ticketId);
    expect(closed!.resolved_at).not.toBeNull();
    expect(closed!.closed_at).not.toBeNull();
  });

  it("cambiar la prioridad NO recalcula sla_due_at", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T", priority: "Baja" }, user.id, { query });
    const original = await getTicketById(ticketId);

    await withTransaction((c) => updateTicket(ticketId, { priority: "Urgente" }, c));
    const updated = await getTicketById(ticketId);

    expect(updated!.priority).toBe("Urgente");
    expect(updated!.sla_due_at).toBe(original!.sla_due_at);
  });

  it("permite limpiar assignee_id a null explícitamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const assignee = await createTestUser();
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T", assignee_id: assignee.id }, user.id, { query });

    await withTransaction((c) => updateTicket(ticketId, { assignee_id: null }, c));
    const ticket = await getTicketById(ticketId);
    expect(ticket!.assignee).toBeNull();
  });

  it("guarda la nota de resolución", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query });

    await withTransaction((c) =>
      updateTicket(ticketId, { status: "Resuelto", resolution_note: "Se reinició el servicio de pagos." }, c)
    );
    const ticket = await getTicketById(ticketId);
    expect(ticket!.resolution_note).toBe("Se reinició el servicio de pagos.");
  });

  it("devuelve null para un ticket que no existe", async () => {
    const result = await withTransaction((c) => updateTicket(999999, { title: "X" }, c));
    expect(result).toBeNull();
  });
});

describe("getClientTickets — portal, todos los proyectos del cliente", () => {
  it("agrega tickets de varios proyectos del mismo cliente, aislado de otros clientes", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const projectA = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    const user = await createTestUser();

    await createTicket({ project_id: projectA.id, title: "Ticket A" }, user.id, { query });
    await createTicket({ project_id: projectB.id, title: "Ticket B" }, user.id, { query });

    const tickets = await getClientTickets(clientA.id);
    expect(tickets.map((t) => t.title)).toEqual(["Ticket A"]);
  });

  it("ordena por creación descendente, no por SLA", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    const firstId = await createTicket({ project_id: project.id, title: "Primero", priority: "Baja" }, user.id, { query });
    const secondId = await createTicket({ project_id: project.id, title: "Segundo", priority: "Urgente" }, user.id, { query });
    // El "Urgente" vence antes, pero getClientTickets no ordena por SLA.
    void firstId;
    void secondId;

    const tickets = await getClientTickets(client.id);
    expect(tickets.map((t) => t.title)).toEqual(["Segundo", "Primero"]);
  });
});

describe("isProjectOwnedByClient", () => {
  it("true si el proyecto pertenece a ese cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    expect(await isProjectOwnedByClient(project.id, client.id)).toBe(true);
  });

  it("false si el proyecto pertenece a otro cliente", async () => {
    const owner = await createTestClient();
    const attacker = await createTestClient();
    const project = await createTestProject(owner.id);
    expect(await isProjectOwnedByClient(project.id, attacker.id)).toBe(false);
  });

  it("false para un proyecto inexistente", async () => {
    const client = await createTestClient();
    expect(await isProjectOwnedByClient(999999, client.id)).toBe(false);
  });
});

describe("recalculateTicketSla", () => {
  const SLA_WINDOWS = { Urgente: 4, Alta: 24, Media: 72, Baja: 120 };

  it("devuelve not_found para un ticket inexistente", async () => {
    const result = await withTransaction((c) => recalculateTicketSla(999999, c, SLA_WINDOWS));
    expect(result).toEqual({ outcome: "not_found" });
  });

  it("recalcula sla_due_at desde ahora, con la prioridad ACTUAL del ticket", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T", priority: "Baja" }, user.id, { query }, SLA_WINDOWS);

    const before = await getTicketById(ticketId);
    const originalDueAt = new Date(before!.sla_due_at).getTime();

    // Se escala a Urgente — el SLA original (calculado sobre "Baja") no cambia solo por esto.
    await withTransaction((c) => updateTicket(ticketId, { priority: "Urgente" }, c));
    const afterPriorityChange = await getTicketById(ticketId);
    expect(new Date(afterPriorityChange!.sla_due_at).getTime()).toBe(originalDueAt);

    const beforeRecalc = Date.now();
    const result = await withTransaction((c) => recalculateTicketSla(ticketId, c, SLA_WINDOWS));
    expect(result.outcome).toBe("ok");

    const after = await getTicketById(ticketId);
    const newDueAt = new Date(after!.sla_due_at).getTime();
    // Ventana de Urgente (4h) contada desde el momento del recálculo, no desde la creación.
    expect(newDueAt).toBeGreaterThan(beforeRecalc + 3.9 * 60 * 60 * 1000);
    expect(newDueAt).toBeLessThan(beforeRecalc + 4.1 * 60 * 60 * 1000);
  });

  it("reinicia sla_warning_notified_at a NULL para que el aviso pueda dispararse de nuevo con la fecha nueva", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query }, SLA_WINDOWS);
    await query(`UPDATE support_tickets SET sla_warning_notified_at = now() WHERE id = $1;`, [ticketId]);

    await withTransaction((c) => recalculateTicketSla(ticketId, c, SLA_WINDOWS));

    const row = await query(`SELECT sla_warning_notified_at FROM support_tickets WHERE id = $1;`, [ticketId]);
    expect(row.rows[0].sla_warning_notified_at).toBeNull();
  });

  it("no recalcula un ticket borrado lógicamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const ticketId = await createTicket({ project_id: project.id, title: "T" }, user.id, { query }, SLA_WINDOWS);
    await query(`UPDATE support_tickets SET deleted_at = now() WHERE id = $1;`, [ticketId]);

    const result = await withTransaction((c) => recalculateTicketSla(ticketId, c, SLA_WINDOWS));
    expect(result).toEqual({ outcome: "not_found" });
  });
});
