import { query } from "../db";
import type { ClientActivity } from "@/components/dashboard/types";

interface QueryRunner {
  query: typeof query;
}

/** Bitácora comercial de un cliente, más reciente primero — ver migración 0032. */
export async function getClientActivities(clientId: number): Promise<ClientActivity[]> {
  const res = await query(
    `SELECT id, client_id, actor_name, body, created_at FROM client_activities WHERE client_id = $1 ORDER BY created_at DESC;`,
    [clientId]
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    client_id: Number(row.client_id),
    actor_name: String(row.actor_name ?? ""),
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
  }));
}

export interface AddClientActivityParams {
  clientId: number;
  actorId?: number | string | null;
  actorName: string;
  body: string;
}

/**
 * Registra una nota de seguimiento comercial. Devuelve `null` si el
 * cliente no existe (o está anonimizado — ver migración 0029: no tiene
 * sentido seguir agregando notas de seguimiento a una identidad que ya se
 * borró a propósito), mismo criterio que `addLeadActivity()`.
 */
export async function addClientActivity(
  { clientId, actorId, actorName, body }: AddClientActivityParams,
  dbRunner?: QueryRunner
): Promise<ClientActivity | null> {
  const executor = dbRunner ?? { query };

  const clientExists = await executor.query(
    "SELECT id FROM clients WHERE id = $1 AND anonymized_at IS NULL;",
    [clientId]
  );
  if (clientExists.rows.length === 0) return null;

  const res = await executor.query(
    `INSERT INTO client_activities (client_id, actor_id, actor_name, body) VALUES ($1, $2, $3, $4)
     RETURNING id, client_id, actor_name, body, created_at;`,
    [clientId, actorId ?? null, actorName, body]
  );

  const row = res.rows[0];
  return {
    id: Number(row.id),
    client_id: Number(row.client_id),
    actor_name: String(row.actor_name ?? ""),
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}
