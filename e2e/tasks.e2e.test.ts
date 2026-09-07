import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Tareas — ruta dual tasks:write vs. autogestión por identidad", () => {
  it("admin (tasks:write) puede crear una tarea y asignarla a otra persona", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const dev = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const res = await adminClient.post("/api/tasks", {
      project_id: project.id,
      title: "Configurar CI",
      assignee_id: dev.id,
    });
    expect(res.status).toBe(200);
    const { task } = await res.json();
    expect(task.assignee.id).toBe(dev.id);
    expect(task.status).toBe("Pendiente");
  });

  it("traffiker sin tasks:write NO puede crear tareas", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await traffikerClient.post("/api/tasks", { project_id: project.id, title: "No debería crear esto" });
    expect(res.status).toBe(403);
  });

  it("el responsable de una tarea puede cambiar SOLO su estado sin tener tasks:write", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "traffiker", password: "SuperSecret123456" }); // sin tasks:write
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/tasks", {
      project_id: project.id,
      title: "Tarea del dev",
      assignee_id: dev.id,
    });
    const { task } = await createRes.json();

    const devClient = await loginAs(dev.email, "SuperSecret123456");
    const statusRes = await devClient.patch(`/api/tasks/${task.id}`, { status: "En Progreso" });
    expect(statusRes.status).toBe(200);
    const { task: updated } = await statusRes.json();
    expect(updated.status).toBe("En Progreso");
  });

  it("sin tasks:write, mandar status JUNTO con otro campo es 403 (no un update parcial silencioso)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/tasks", {
      project_id: project.id,
      title: "Original",
      assignee_id: dev.id,
    });
    const { task } = await createRes.json();

    const devClient = await loginAs(dev.email, "SuperSecret123456");
    const res = await devClient.patch(`/api/tasks/${task.id}`, { status: "Completada", title: "Intento de colarme" });
    expect(res.status).toBe(403);
  });

  it("un usuario interno NO puede cambiar el estado de una tarea asignada a otra persona", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const dev = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const impostor = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const createRes = await adminClient.post("/api/tasks", {
      project_id: project.id,
      title: "Tarea ajena",
      assignee_id: dev.id,
    });
    const { task } = await createRes.json();

    const impostorClient = await loginAs(impostor.email, "SuperSecret123456");
    const res = await impostorClient.patch(`/api/tasks/${task.id}`, { status: "Completada" });
    expect(res.status).toBe(404); // no distingue "no existe" de "no es tuya", ver updateOwnTaskStatus
  });

  it("sales_manager (tasks:write) puede eliminar una tarea; traffiker no", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");
    const createRes = await salesClient.post("/api/tasks", { project_id: project.id, title: "Para borrar" });
    const { task } = await createRes.json();

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const forbidden = await traffikerClient.delete(`/api/tasks/${task.id}`);
    expect(forbidden.status).toBe(403);

    const allowed = await salesClient.delete(`/api/tasks/${task.id}`);
    expect(allowed.status).toBe(200);

    const listRes = await salesClient.get(`/api/tasks?projectId=${project.id}`);
    const { tasks } = await listRes.json();
    expect(tasks).toHaveLength(0);
  });

  it("un cliente (portal) no tiene tasks:read ni tasks:write", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const project = await createTestProject(client.id);

    const clientBrowser = await loginAs(clientUser.email, "SuperSecret123456");
    const res = await clientBrowser.get(`/api/tasks?projectId=${project.id}`);
    expect(res.status).toBe(403);
  });
});
