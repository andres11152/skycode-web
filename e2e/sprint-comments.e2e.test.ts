import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestProject, createTestSprint, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Comentarios en entregables — extremo a extremo", () => {
  it("un cliente comenta en un sprint de su propio proyecto", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);

    const browser = await loginAs(clientUser.email, "SuperSecret123456");
    const postRes = await browser.post(`/api/sprints/${sprint.id}/comments`, { body: "¿Cuándo queda listo?" });
    expect(postRes.status).toBe(200);

    const listRes = await browser.get(`/api/sprints/${sprint.id}/comments`);
    const { comments } = await listRes.json();
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("¿Cuándo queda listo?");
    expect(comments[0].author.role).toBe("client");
  });

  it("el equipo interno (tasks:write) responde en el mismo hilo", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });

    const adminBrowser = await loginAs(admin.email, "SuperSecret123456");
    const postRes = await adminBrowser.post(`/api/sprints/${sprint.id}/comments`, { body: "Ya quedó, revisa de nuevo." });
    expect(postRes.status).toBe(200);
    const { comment } = await postRes.json();
    expect(comment.author.role).toBe("admin");
  });

  it("un cliente no puede comentar en el sprint de otro cliente (404, no revela que existe)", async () => {
    const ownClient = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: ownClient.id, password: "SuperSecret123456" });
    const otherClient = await createTestClient();
    const otherProject = await createTestProject(otherClient.id);
    const otherSprint = await createTestSprint(otherProject.id);

    const browser = await loginAs(clientUser.email, "SuperSecret123456");
    const res = await browser.post(`/api/sprints/${otherSprint.id}/comments`, { body: "Intento ajeno" });
    expect(res.status).toBe(404);
  });

  it("traffiker (sin tasks:read/write) no puede leer ni comentar", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });

    const browser = await loginAs(traffiker.email, "SuperSecret123456");
    expect((await browser.get(`/api/sprints/${sprint.id}/comments`)).status).toBe(403);
    expect((await browser.post(`/api/sprints/${sprint.id}/comments`, { body: "x" })).status).toBe(403);
  });

  it("rechaza un comentario vacío (400)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const sprint = await createTestSprint(project.id);
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });

    const browser = await loginAs(admin.email, "SuperSecret123456");
    const res = await browser.post(`/api/sprints/${sprint.id}/comments`, { body: "   " });
    expect(res.status).toBe(400);
  });

  it("un sprint inexistente da 404 al listar o comentar (equipo interno)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const browser = await loginAs(admin.email, "SuperSecret123456");

    expect((await browser.get("/api/sprints/999999/comments")).status).toBe(404);
    expect((await browser.post("/api/sprints/999999/comments", { body: "x" })).status).toBe(404);
  });
});
