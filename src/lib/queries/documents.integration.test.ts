import { beforeEach, describe, expect, it } from "vitest";
import {
  getProjectDocuments,
  getClientDocuments,
  isDocumentOwnedByClient,
  getDocumentFileRow,
  createDocumentRecord,
  softDeleteDocument,
} from "./documents";
import { query, withTransaction } from "../db";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createDocumentRecord / getProjectDocuments", () => {
  it("crea un documento y lo devuelve con quién lo subió", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const uploader = await createTestUser({ name: "Admin Uno" });

    const id = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "contrato.pdf", mime_type: "application/pdf", size_bytes: 1024, storage_key: "abc-123.pdf" },
        uploader.id,
        c
      )
    );

    const documents = await getProjectDocuments(project.id);
    expect(documents).toHaveLength(1);
    expect(documents[0].id).toBe(id);
    expect(documents[0].original_filename).toBe("contrato.pdf");
    expect(documents[0].uploaded_by).toEqual({ id: uploader.id, name: "Admin Uno", email: uploader.email });
  });

  it("no expone storage_key en getProjectDocuments (solo en getDocumentFileRow)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "x.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "secreto.pdf" },
        user.id,
        c
      )
    );

    const documents = await getProjectDocuments(project.id);
    expect(documents[0]).not.toHaveProperty("storage_key");
  });

  it("no devuelve documentos de otro proyecto ni borrados", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const otherProject = await createTestProject(client.id);
    const user = await createTestUser();

    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "visible.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "a.pdf" },
        user.id,
        c
      )
    );
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: otherProject.id, original_filename: "de-otro.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "b.pdf" },
        user.id,
        c
      )
    );
    const deletedId = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "borrado.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "c.pdf" },
        user.id,
        c
      )
    );
    await query(`UPDATE documents SET deleted_at = now() WHERE id = $1;`, [deletedId]);

    const documents = await getProjectDocuments(project.id);
    expect(documents.map((d) => d.original_filename)).toEqual(["visible.pdf"]);
  });

  it("ordena por más reciente primero", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "primero.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "a.pdf" },
        user.id,
        c
      )
    );
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "segundo.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "b.pdf" },
        user.id,
        c
      )
    );

    const documents = await getProjectDocuments(project.id);
    expect(documents.map((d) => d.original_filename)).toEqual(["segundo.pdf", "primero.pdf"]);
  });
});

describe("getDocumentFileRow", () => {
  it("devuelve el storage_key real, para las rutas de descarga/borrado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "x.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "clave-real.pdf" },
        user.id,
        c
      )
    );

    const row = await getDocumentFileRow(id);
    expect(row).not.toBeNull();
    expect(row!.storage_key).toBe("clave-real.pdf");
  });

  it("devuelve null para un documento borrado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "x.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "a.pdf" },
        user.id,
        c
      )
    );
    await query(`UPDATE documents SET deleted_at = now() WHERE id = $1;`, [id]);

    expect(await getDocumentFileRow(id)).toBeNull();
  });
});

describe("softDeleteDocument", () => {
  it("borra lógicamente y devuelve el storage_key para poder borrar el archivo físico", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "x.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "clave.pdf" },
        user.id,
        c
      )
    );

    const result = await withTransaction((c) => softDeleteDocument(id, c));
    expect(result).toEqual({ storage_key: "clave.pdf" });
    expect(await getProjectDocuments(project.id)).toHaveLength(0);
  });

  it("devuelve null si ya estaba borrado o no existe", async () => {
    const result = await withTransaction((c) => softDeleteDocument(999999, c));
    expect(result).toBeNull();
  });
});

describe("getClientDocuments — portal, todos los proyectos del cliente", () => {
  it("agrega documentos de varios proyectos del mismo cliente, aislado de otros clientes", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const projectA1 = await createTestProject(clientA.id);
    const projectA2 = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    const user = await createTestUser();

    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: projectA1.id, original_filename: "a1.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "a1.pdf" },
        user.id,
        c
      )
    );
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: projectA2.id, original_filename: "a2.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "a2.pdf" },
        user.id,
        c
      )
    );
    await withTransaction((c) =>
      createDocumentRecord(
        { project_id: projectB.id, original_filename: "b.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "b.pdf" },
        user.id,
        c
      )
    );

    const documents = await getClientDocuments(clientA.id);
    expect(documents.map((d) => d.original_filename).sort()).toEqual(["a1.pdf", "a2.pdf"]);
    expect(documents.every((d) => d.project_title)).toBe(true);
  });
});

describe("isDocumentOwnedByClient", () => {
  it("true si el proyecto del documento pertenece a ese cliente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "x.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "x.pdf" },
        user.id,
        c
      )
    );

    expect(await isDocumentOwnedByClient(id, client.id)).toBe(true);
  });

  it("false si el documento pertenece a otro cliente", async () => {
    const owner = await createTestClient();
    const attacker = await createTestClient();
    const project = await createTestProject(owner.id);
    const user = await createTestUser();
    const id = await withTransaction((c) =>
      createDocumentRecord(
        { project_id: project.id, original_filename: "x.pdf", mime_type: "application/pdf", size_bytes: 1, storage_key: "x.pdf" },
        user.id,
        c
      )
    );

    expect(await isDocumentOwnedByClient(id, attacker.id)).toBe(false);
  });

  it("false para un documento inexistente", async () => {
    const client = await createTestClient();
    expect(await isDocumentOwnedByClient(999999, client.id)).toBe(false);
  });
});
