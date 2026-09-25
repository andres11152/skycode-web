import { beforeEach, describe, expect, it } from "vitest";
import { createTask, getProjectTasks, getTaskById, updateTask, updateOwnTaskStatus, softDeleteTask, getTasksAssignedToUser } from "./tasks";
import { query, withTransaction } from "../db";
import { createTestClient, createTestProject, createTestUser, createTestTimeEntry, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

async function createSprint(projectId: number, title = "Sprint 1") {
  const res = await query(`INSERT INTO sprints (project_id, title) VALUES ($1, $2) RETURNING id;`, [projectId, title]);
  return res.rows[0].id as number;
}

describe("createTask / getProjectTasks", () => {
  it("crea una tarea y la devuelve con sprint, responsable y horas reales en cero", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createSprint(project.id);
    const assignee = await createTestUser({ name: "Dev Uno" });
    const creator = await createTestUser({ name: "Admin" });

    const taskId = await createTask(
      { project_id: project.id, sprint_id: sprint, title: "Integrar pagos", assignee_id: assignee.id, estimated_hours: 8 },
      creator.id,
      { query }
    );

    const tasks = await getProjectTasks(project.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(taskId);
    expect(tasks[0].title).toBe("Integrar pagos");
    expect(tasks[0].sprint_title).toBe("Sprint 1");
    expect(tasks[0].assignee).toEqual({ id: assignee.id, name: "Dev Uno", email: assignee.email });
    expect(tasks[0].estimated_hours).toBe(8);
    expect(tasks[0].actual_hours).toBe(0);
    expect(tasks[0].status).toBe("Pendiente");
  });

  it("suma las horas reales desde time_entries.task_id", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "Con horas" }, user.id, { query });

    await query(`UPDATE time_entries SET task_id = $1 WHERE id = $2;`, [
      taskId,
      (await createTestTimeEntry(user.id, project.id, { hours: 3 })).id,
    ]);
    await query(`UPDATE time_entries SET task_id = $1 WHERE id = $2;`, [
      taskId,
      (await createTestTimeEntry(user.id, project.id, { hours: 2.5 })).id,
    ]);

    const task = await getTaskById(taskId);
    expect(task!.actual_hours).toBe(5.5);
  });

  it("no devuelve tareas de otro proyecto ni borradas", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const otherProject = await createTestProject(client.id);
    const user = await createTestUser();

    await createTask({ project_id: project.id, title: "Visible" }, user.id, { query });
    await createTask({ project_id: otherProject.id, title: "De otro proyecto" }, user.id, { query });
    const toDelete = await createTask({ project_id: project.id, title: "Borrada" }, user.id, { query });
    await query(`UPDATE tasks SET deleted_at = now() WHERE id = $1;`, [toDelete]);

    const tasks = await getProjectTasks(project.id);
    expect(tasks.map((t) => t.title)).toEqual(["Visible"]);
  });
});

describe("updateTask", () => {
  it("edita campos parciales sin tocar los que no vienen en el payload", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "Original", estimated_hours: 5 }, user.id, { query });

    const result = await withTransaction((c) => updateTask(taskId, { title: "Renombrada" }, c));

    expect(result!.after.title).toBe("Renombrada");
    expect(Number(result!.after.estimated_hours)).toBe(5); // no se tocó
  });

  it("permite limpiar assignee_id a null explícitamente (no solo omitirlo)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const assignee = await createTestUser();
    const user = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "T", assignee_id: assignee.id }, user.id, { query });

    await withTransaction((c) => updateTask(taskId, { assignee_id: null }, c));

    const task = await getTaskById(taskId);
    expect(task!.assignee).toBeNull();
  });

  it("marcar status Completada setea completed_at, y volver a Pendiente lo limpia", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "T" }, user.id, { query });

    await withTransaction((c) => updateTask(taskId, { status: "Completada" }, c));
    const completed = await getTaskById(taskId);
    expect(completed!.completed_at).not.toBeNull();

    await withTransaction((c) => updateTask(taskId, { status: "Pendiente" }, c));
    const reopened = await getTaskById(taskId);
    expect(reopened!.completed_at).toBeNull();
  });

  it("devuelve null para una tarea que no existe o ya fue borrada", async () => {
    const result = await withTransaction((c) => updateTask(999999, { title: "X" }, c));
    expect(result).toBeNull();
  });
});

describe("updateOwnTaskStatus — autogestión por identidad", () => {
  it("el responsable puede cambiar el estado de su propia tarea", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const assignee = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "T", assignee_id: assignee.id }, assignee.id, { query });

    const updated = await updateOwnTaskStatus(taskId, "En Progreso", assignee.id);
    expect(updated).not.toBeNull();
    expect(updated.status).toBe("En Progreso");
  });

  it("NO permite cambiar el estado de una tarea asignada a otra persona", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const assignee = await createTestUser();
    const impostor = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "T", assignee_id: assignee.id }, assignee.id, { query });

    const result = await updateOwnTaskStatus(taskId, "Completada", impostor.id);
    expect(result).toBeNull();

    const task = await getTaskById(taskId);
    expect(task!.status).toBe("Pendiente"); // sin cambios
  });

  it("NO permite cambiar el estado de una tarea sin asignar", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const someone = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "Sin asignar" }, someone.id, { query });

    const result = await updateOwnTaskStatus(taskId, "Completada", someone.id);
    expect(result).toBeNull();
  });
});

describe("softDeleteTask", () => {
  it("borra lógicamente y deja de aparecer en getProjectTasks", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "T" }, user.id, { query });

    const deleted = await withTransaction((c) => softDeleteTask(taskId, c));
    expect(deleted).not.toBeNull();

    expect(await getProjectTasks(project.id)).toHaveLength(0);
  });

  it("devuelve null si ya estaba borrada", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const taskId = await createTask({ project_id: project.id, title: "T" }, user.id, { query });

    await withTransaction((c) => softDeleteTask(taskId, c));
    const secondAttempt = await withTransaction((c) => softDeleteTask(taskId, c));
    expect(secondAttempt).toBeNull();
  });
});

describe("getTasksAssignedToUser", () => {
  it("trae tareas de VARIOS proyectos distintos, no solo uno", async () => {
    const client = await createTestClient();
    const projectA = await createTestProject(client.id, { title: "Proyecto A" });
    const projectB = await createTestProject(client.id, { title: "Proyecto B" });
    const dev = await createTestUser({ name: "Dev Uno" });
    const creator = await createTestUser();

    await createTask({ project_id: projectA.id, title: "Tarea en A", assignee_id: dev.id }, creator.id, { query });
    await createTask({ project_id: projectB.id, title: "Tarea en B", assignee_id: dev.id }, creator.id, { query });

    const myTasks = await getTasksAssignedToUser(dev.id);
    expect(myTasks).toHaveLength(2);
    expect(myTasks.map((t) => t.project_title).sort()).toEqual(["Proyecto A", "Proyecto B"]);
  });

  it("no trae tareas asignadas a otra persona", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const devA = await createTestUser();
    const devB = await createTestUser();
    const creator = await createTestUser();
    await createTask({ project_id: project.id, title: "De A", assignee_id: devA.id }, creator.id, { query });
    await createTask({ project_id: project.id, title: "De B", assignee_id: devB.id }, creator.id, { query });

    const myTasks = await getTasksAssignedToUser(devA.id);
    expect(myTasks).toHaveLength(1);
    expect(myTasks[0].title).toBe("De A");
  });

  it("no trae tareas borradas lógicamente ni de proyectos borrados", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const deletedProject = await createTestProject(client.id);
    const dev = await createTestUser();
    const creator = await createTestUser();

    const deletedTaskId = await createTask({ project_id: project.id, title: "Borrada", assignee_id: dev.id }, creator.id, { query });
    await withTransaction((c) => softDeleteTask(deletedTaskId, c));

    await createTask({ project_id: deletedProject.id, title: "En proyecto borrado", assignee_id: dev.id }, creator.id, { query });
    await query(`UPDATE projects SET deleted_at = now() WHERE id = $1;`, [deletedProject.id]);

    await createTask({ project_id: project.id, title: "Sigue viva", assignee_id: dev.id }, creator.id, { query });

    const myTasks = await getTasksAssignedToUser(dev.id);
    expect(myTasks).toHaveLength(1);
    expect(myTasks[0].title).toBe("Sigue viva");
  });

  it("sin asignación (assignee_id null), no aparece para nadie", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser();
    const creator = await createTestUser();
    await createTask({ project_id: project.id, title: "Sin asignar" }, creator.id, { query });

    expect(await getTasksAssignedToUser(dev.id)).toEqual([]);
  });

  it("ordena las no completadas antes que las completadas", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser();
    const creator = await createTestUser();

    const doneId = await createTask({ project_id: project.id, title: "Ya terminada", assignee_id: dev.id }, creator.id, { query });
    await withTransaction((c) => updateTask(doneId, { status: "Completada" }, c));
    await createTask({ project_id: project.id, title: "Pendiente todavía", assignee_id: dev.id }, creator.id, { query });

    const myTasks = await getTasksAssignedToUser(dev.id);
    expect(myTasks.map((t) => t.title)).toEqual(["Pendiente todavía", "Ya terminada"]);
  });
});
