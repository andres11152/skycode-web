import { beforeEach, describe, expect, it } from "vitest";
import { getSprintComments, createSprintComment, isSprintOwnedByClient, sprintExists } from "./sprintComments";
import { withTransaction } from "../db";
import { createTestClient, createTestProject, createTestSprint, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createSprintComment / getSprintComments", () => {
  it("crea un comentario y lo lista con el autor", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);
    const user = await createTestUser({ name: "Ana Interna", role: "admin" });

    await withTransaction((c) => createSprintComment(sprint.id, user.id, "¿Cuándo queda listo?", c));

    const comments = await getSprintComments(sprint.id);
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("¿Cuándo queda listo?");
    expect(comments[0].author).toEqual({ id: user.id, name: "Ana Interna", role: "admin" });
  });

  it("lista los comentarios en orden cronológico", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);
    const user = await createTestUser();

    await withTransaction((c) => createSprintComment(sprint.id, user.id, "Primero", c));
    await withTransaction((c) => createSprintComment(sprint.id, user.id, "Segundo", c));

    const comments = await getSprintComments(sprint.id);
    expect(comments.map((c) => c.body)).toEqual(["Primero", "Segundo"]);
  });

  it("un sprint sin comentarios devuelve una lista vacía", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);

    expect(await getSprintComments(sprint.id)).toEqual([]);
  });
});

describe("isSprintOwnedByClient", () => {
  it("devuelve true si el sprint pertenece a un proyecto del cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);

    expect(await isSprintOwnedByClient(sprint.id, client.id)).toBe(true);
  });

  it("devuelve false si el sprint pertenece a otro cliente", async () => {
    const owner = await createTestClient();
    const other = await createTestClient();
    const project = await createTestProject(owner.id);
    const sprint = await createTestSprint(project.id);

    expect(await isSprintOwnedByClient(sprint.id, other.id)).toBe(false);
  });

  it("devuelve false para un sprint inexistente", async () => {
    const client = await createTestClient();
    expect(await isSprintOwnedByClient(999999, client.id)).toBe(false);
  });
});

describe("sprintExists", () => {
  it("devuelve true/false correctamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);

    expect(await sprintExists(sprint.id)).toBe(true);
    expect(await sprintExists(999999)).toBe(false);
  });
});
