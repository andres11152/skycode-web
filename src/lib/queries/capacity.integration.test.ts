import { beforeEach, describe, expect, it } from "vitest";
import { getTeamCapacity } from "./capacity";
import { query } from "../db";
import { createTestClient, createTestProject, createTestUser, createTestTimeEntry, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

async function createTask(
  projectId: number,
  assigneeId: number,
  createdBy: number,
  overrides: { status?: string; estimatedHours?: number } = {}
) {
  const res = await query(
    `INSERT INTO tasks (project_id, assignee_id, title, status, estimated_hours, created_by)
     VALUES ($1, $2, 'T', $3, $4, $5) RETURNING id;`,
    [projectId, assigneeId, overrides.status ?? "Pendiente", overrides.estimatedHours ?? null, createdBy]
  );
  return res.rows[0].id as number;
}

async function createTicket(
  projectId: number,
  assigneeId: number,
  createdBy: number,
  status = "Abierto"
) {
  const res = await query(
    `INSERT INTO support_tickets (project_id, assignee_id, title, status, sla_due_at, created_by)
     VALUES ($1, $2, 'Ticket', $3, now() + interval '1 day', $4) RETURNING id;`,
    [projectId, assigneeId, status, createdBy]
  );
  return res.rows[0].id as number;
}

describe("getTeamCapacity", () => {
  it("cuenta solo tareas abiertas (no Completada) y suma sus horas estimadas", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser({ name: "Dev Uno" });

    await createTask(project.id, dev.id, dev.id, { status: "Pendiente", estimatedHours: 5 });
    await createTask(project.id, dev.id, dev.id, { status: "En Progreso", estimatedHours: 3 });
    await createTask(project.id, dev.id, dev.id, { status: "Completada", estimatedHours: 8 }); // no debe contar

    const capacity = await getTeamCapacity();
    const row = capacity.find((c) => c.id === dev.id);
    expect(row).toBeDefined();
    expect(row!.open_tasks_count).toBe(2);
    expect(row!.open_estimated_hours).toBe(8); // 5 + 3, no 16
  });

  it("cuenta solo tickets Abierto/En Progreso, no Resuelto/Cerrado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser();

    await createTicket(project.id, dev.id, dev.id, "Abierto");
    await createTicket(project.id, dev.id, dev.id, "En Progreso");
    await createTicket(project.id, dev.id, dev.id, "Resuelto");
    await createTicket(project.id, dev.id, dev.id, "Cerrado");

    const capacity = await getTeamCapacity();
    const row = capacity.find((c) => c.id === dev.id);
    expect(row!.open_tickets_count).toBe(2);
  });

  it("suma horas registradas esta semana sin duplicar por el cruce con tareas/tickets (sin fan-out)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser();

    // 2 tareas + 2 tickets + 2 entradas de horas para la misma persona —
    // si el query hiciera JOIN directo de las tres tablas sin agregar
    // primero, esto multiplicaría las horas (fan-out).
    await createTask(project.id, dev.id, dev.id, { estimatedHours: 4 });
    await createTask(project.id, dev.id, dev.id, { estimatedHours: 6 });
    await createTicket(project.id, dev.id, dev.id);
    await createTicket(project.id, dev.id, dev.id);
    await createTestTimeEntry(dev.id, project.id, { hours: 3 });
    await createTestTimeEntry(dev.id, project.id, { hours: 2 });

    const capacity = await getTeamCapacity();
    const row = capacity.find((c) => c.id === dev.id);
    expect(row!.hours_this_week).toBe(5); // 3 + 2, no multiplicado
    expect(row!.open_tasks_count).toBe(2);
    expect(row!.open_tickets_count).toBe(2);
  });

  it("no cuenta horas registradas fuera de la semana en curso", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser();

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 8);
    await createTestTimeEntry(dev.id, project.id, { hours: 10, entryDate: lastWeek.toISOString().slice(0, 10) });
    await createTestTimeEntry(dev.id, project.id, { hours: 4 }); // hoy

    const capacity = await getTeamCapacity();
    const row = capacity.find((c) => c.id === dev.id);
    expect(row!.hours_this_week).toBe(4);
  });

  it("excluye clientes (role='client') y usuarios inactivos", async () => {
    const client = await createTestClient();
    await createTestUser({ role: "client", clientId: client.id, name: "Cliente" });
    await createTestUser({ role: "traffiker", status: "disabled", name: "Desactivado" });
    const active = await createTestUser({ role: "admin", name: "Activo" });

    const capacity = await getTeamCapacity();
    expect(capacity.map((c) => c.name)).toEqual(["Activo"]);
    expect(capacity[0].id).toBe(active.id);
  });

  it("una persona sin tareas/tickets/horas aparece con todo en cero, no se omite", async () => {
    await createTestUser({ name: "Sin Actividad" });

    const capacity = await getTeamCapacity();
    const row = capacity.find((c) => c.name === "Sin Actividad");
    expect(row).toBeDefined();
    expect(row!.open_tasks_count).toBe(0);
    expect(row!.open_estimated_hours).toBe(0);
    expect(row!.open_tickets_count).toBe(0);
    expect(row!.hours_this_week).toBe(0);
  });

  it("ordena por horas estimadas pendientes descendente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const busy = await createTestUser({ name: "Ocupado" });
    const free = await createTestUser({ name: "Libre" });

    await createTask(project.id, busy.id, busy.id, { estimatedHours: 20 });
    await createTask(project.id, free.id, free.id, { estimatedHours: 1 });

    const capacity = await getTeamCapacity();
    const names = capacity.map((c) => c.name);
    expect(names.indexOf("Ocupado")).toBeLessThan(names.indexOf("Libre"));
  });
});
