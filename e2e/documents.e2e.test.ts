import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

function pdfFormData(projectId: number, filename = "contrato.pdf", content = "contenido de prueba") {
  const formData = new FormData();
  formData.append("project_id", String(projectId));
  formData.append("file", new Blob([content], { type: "application/pdf" }), filename);
  return formData;
}

describe("Documentos — subida, descarga y RBAC de extremo a extremo", () => {
  it("admin (documents:write) sube un documento y puede descargarlo con su contenido exacto", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch("/api/documents", {
      method: "POST",
      body: pdfFormData(project.id, "contrato.pdf", "hola mundo"),
    });
    expect(uploadRes.status).toBe(200);
    const { document } = await uploadRes.json();
    expect(document.original_filename).toBe("contrato.pdf");

    const downloadRes = await adminClient.get(`/api/documents/${document.id}/download`);
    expect(downloadRes.status).toBe(200);
    expect(await downloadRes.text()).toBe("hola mundo");
    expect(downloadRes.headers.get("content-disposition")).toContain("contrato.pdf");
  });

  it("traffiker (sin documents:write) no puede subir documentos", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await traffikerClient.fetch("/api/documents", { method: "POST", body: pdfFormData(project.id) });
    expect(res.status).toBe(403);
  });

  it("traffiker (sin documents:read) no puede listar ni descargar", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch("/api/documents", { method: "POST", body: pdfFormData(project.id) });
    const { document } = await uploadRes.json();

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const listRes = await traffikerClient.get(`/api/documents?projectId=${project.id}`);
    expect(listRes.status).toBe(403);

    const downloadRes = await traffikerClient.get(`/api/documents/${document.id}/download`);
    expect(downloadRes.status).toBe(403);
  });

  it("rechaza una extensión no permitida (ej. .exe)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const formData = new FormData();
    formData.append("project_id", String(project.id));
    formData.append("file", new Blob(["MZ..."], { type: "application/x-msdownload" }), "virus.exe");

    const res = await adminClient.fetch("/api/documents", { method: "POST", body: formData });
    expect(res.status).toBe(400);
  });

  it("rechaza una subida sin archivo", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const formData = new FormData();
    formData.append("project_id", String(project.id));

    const res = await adminClient.fetch("/api/documents", { method: "POST", body: formData });
    expect(res.status).toBe(400);
  });

  it("sales_manager (documents:write) puede eliminar un documento subido por admin", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch("/api/documents", { method: "POST", body: pdfFormData(project.id) });
    const { document } = await uploadRes.json();

    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");
    const deleteRes = await salesClient.delete(`/api/documents/${document.id}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await adminClient.get(`/api/documents?projectId=${project.id}`);
    const { documents } = await listRes.json();
    expect(documents).toHaveLength(0);

    // El archivo ya borrado no se puede volver a descargar.
    const downloadRes = await adminClient.get(`/api/documents/${document.id}/download`);
    expect(downloadRes.status).toBe(404);
  });

  it("un documento inexistente da 404 al descargarlo o borrarlo", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.get("/api/documents/999999/download")).status).toBe(404);
    expect((await adminClient.delete("/api/documents/999999")).status).toBe(404);
  });

  it("un cliente de portal no tiene acceso a los documentos internos", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const project = await createTestProject(client.id);
    const clientBrowser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await clientBrowser.get(`/api/documents?projectId=${project.id}`);
    expect(res.status).toBe(403);
  });
});
