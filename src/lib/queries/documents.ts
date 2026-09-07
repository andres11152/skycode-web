import { query } from "../db";
import type { ProjectDocument } from "@/components/dashboard/types";

const DOCUMENTS_SELECT = `
  SELECT d.id, d.project_id, p.title AS project_title, d.original_filename, d.mime_type, d.size_bytes, d.created_at,
         u.id AS uploader_id, u.name AS uploader_name, u.email AS uploader_email
  FROM documents d
  JOIN projects p ON p.id = d.project_id
  LEFT JOIN users u ON u.id = d.uploaded_by
`;

function shapeDocumentRow(row: Record<string, unknown>): ProjectDocument {
  const uploaderId = row.uploader_id ? Number(row.uploader_id) : null;
  const uploaderName = typeof row.uploader_name === "string" ? row.uploader_name : null;
  const uploaderEmail = typeof row.uploader_email === "string" ? row.uploader_email : null;

  return {
    id: Number(row.id),
    project_id: Number(row.project_id),
    project_title: String(row.project_title ?? ""),
    original_filename: String(row.original_filename ?? ""),
    mime_type: String(row.mime_type ?? ""),
    size_bytes: Number(row.size_bytes ?? 0),
    uploaded_by: uploaderId && uploaderName && uploaderEmail ? { id: uploaderId, name: uploaderName, email: uploaderEmail } : null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function getProjectDocuments(projectId: number): Promise<ProjectDocument[]> {
  const res = await query(
    `${DOCUMENTS_SELECT} WHERE d.project_id = $1 AND d.deleted_at IS NULL ORDER BY d.created_at DESC;`,
    [projectId]
  );
  return res.rows.map(shapeDocumentRow);
}

/**
 * Documentos de TODOS los proyectos de un cliente (portal, solo lectura)
 * — mismo criterio de dueño que `getClientProjects`/`getClientInvoices`.
 */
export async function getClientDocuments(clientId: number | string): Promise<ProjectDocument[]> {
  const res = await query(
    `${DOCUMENTS_SELECT} WHERE p.client_id = $1 AND d.deleted_at IS NULL ORDER BY d.created_at DESC;`,
    [clientId]
  );
  return res.rows.map(shapeDocumentRow);
}

/** `true` si el proyecto dueño del documento pertenece a ese cliente (para la ruta de descarga desde /portal). */
export async function isDocumentOwnedByClient(documentId: number, clientId: number | string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM documents d JOIN projects p ON p.id = d.project_id
     WHERE d.id = $1 AND p.client_id = $2 AND d.deleted_at IS NULL;`,
    [documentId, clientId]
  );
  return res.rows.length > 0;
}

/** Fila cruda (con `storage_key`) — solo para uso interno de las rutas de descarga/borrado, nunca expuesta al cliente. */
export interface DocumentFileRow {
  id: number;
  project_id: number;
  original_filename: string;
  mime_type: string;
  storage_key: string;
}

export async function getDocumentFileRow(id: number): Promise<DocumentFileRow | null> {
  const res = await query(
    `SELECT id, project_id, original_filename, mime_type, storage_key
     FROM documents WHERE id = $1 AND deleted_at IS NULL;`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    project_id: Number(row.project_id),
    original_filename: String(row.original_filename ?? ""),
    mime_type: String(row.mime_type ?? ""),
    storage_key: String(row.storage_key ?? ""),
  };
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateDocumentData {
  project_id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
}

export async function createDocumentRecord(
  data: CreateDocumentData,
  uploadedBy: number | string,
  dbRunner: QueryRunner
): Promise<number> {
  const res = await dbRunner.query(
    `INSERT INTO documents (project_id, original_filename, mime_type, size_bytes, storage_key, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id;`,
    [data.project_id, data.original_filename, data.mime_type, data.size_bytes, data.storage_key, uploadedBy]
  );
  return res.rows[0].id as number;
}

/** Borrado lógico — devuelve el `storage_key` para que el caller borre también el archivo físico. */
export async function softDeleteDocument(id: number, dbRunner: QueryRunner): Promise<{ storage_key: string } | null> {
  const res = await dbRunner.query(
    `UPDATE documents SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING storage_key;`,
    [id]
  );
  const row = res.rows[0];
  return row ? { storage_key: String(row.storage_key) } : null;
}
