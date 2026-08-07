import { beforeEach, describe, expect, it } from "vitest";
import { getAllActiveProjects, getClientProjects } from "./projects";
import { query } from "../db";
import { createTestClient, createTestProject, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getAllActiveProjects", () => {
  it("devuelve proyectos con su cliente enlazado y sus sprints", async () => {
    const client = await createTestClient({ name: "Acme" });
    const project = await createTestProject(client.id, { title: "Sitio Corporativo" });
    await query(`INSERT INTO sprints (project_id, title, status, progress) VALUES ($1,$2,$3,$4);`, [
      project.id,
      "Sprint 1",
      "En Progreso",
      50,
    ]);

    const projects = await getAllActiveProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].client).toEqual({ id: client.id, name: "Acme", email: client.email });
    expect(projects[0].sprints).toHaveLength(1);
    expect(projects[0].sprints[0].title).toBe("Sprint 1");
  });

  it("excluye proyectos borrados lógicamente", async () => {
    const client = await createTestClient();
    await createTestProject(client.id, { title: "Activo" });
    const deleted = await createTestProject(client.id, { title: "Eliminado" });
    await query(`UPDATE projects SET deleted_at = now() WHERE id = $1;`, [deleted.id]);

    const projects = await getAllActiveProjects();
    expect(projects.map((p) => p.title)).toEqual(["Activo"]);
  });

  it("ordena por más reciente primero", async () => {
    const client = await createTestClient();
    await query(`INSERT INTO projects (client_id, title, status, created_at) VALUES ($1,$2,$3,$4);`, [
      client.id,
      "Viejo",
      "En Desarrollo",
      new Date("2026-01-01T00:00:00Z"),
    ]);
    await query(`INSERT INTO projects (client_id, title, status, created_at) VALUES ($1,$2,$3,$4);`, [
      client.id,
      "Nuevo",
      "En Desarrollo",
      new Date("2026-02-01T00:00:00Z"),
    ]);

    const projects = await getAllActiveProjects();
    expect(projects.map((p) => p.title)).toEqual(["Nuevo", "Viejo"]);
  });

  it("un proyecto sin sprints devuelve un arreglo vacío, no undefined", async () => {
    const client = await createTestClient();
    await createTestProject(client.id);

    const projects = await getAllActiveProjects();
    expect(projects[0].sprints).toEqual([]);
  });
});

describe("getClientProjects", () => {
  it("solo devuelve proyectos del cliente indicado, aislados de otros clientes", async () => {
    const clientA = await createTestClient({ name: "Cliente A" });
    const clientB = await createTestClient({ name: "Cliente B" });
    await createTestProject(clientA.id, { title: "Proyecto A" });
    await createTestProject(clientB.id, { title: "Proyecto B" });

    const projectsA = await getClientProjects(clientA.id);
    expect(projectsA).toHaveLength(1);
    expect(projectsA[0].title).toBe("Proyecto A");
  });

  it("excluye proyectos borrados lógicamente del cliente", async () => {
    const client = await createTestClient();
    const deleted = await createTestProject(client.id, { title: "Eliminado" });
    await query(`UPDATE projects SET deleted_at = now() WHERE id = $1;`, [deleted.id]);

    const projects = await getClientProjects(client.id);
    expect(projects).toEqual([]);
  });
});
