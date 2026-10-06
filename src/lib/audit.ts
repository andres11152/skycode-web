import { logError } from "./logger";

export interface AuditEntry {
  /** `null` para acciones sin usuario del sistema detrás (ej. un cliente
   * externo aceptando una propuesta por enlace público, sin cuenta) —
   * `actor_id` en la base es una FK a `users(id)`, no admite texto libre. */
  actorId: number | string | null;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | number;
  diff?: unknown;
  ip?: string | null;
}

/**
 * Firma compatible tanto con `query()` de lib/db.ts como con
 * `client.query.bind(client)` de una transacción de `pg` — así `logAudit`
 * no depende de tipos de `pg` y el caller decide si la escritura de
 * auditoría va en la misma transacción que el cambio que documenta (debe
 * ir, siempre que el cambio se pueda revertir).
 */
export type QueryFn = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

export async function logAudit(runQuery: QueryFn, entry: AuditEntry): Promise<void> {
  await runQuery(
    `INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, diff, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [
      entry.actorId,
      entry.actorEmail,
      entry.action,
      entry.entityType,
      String(entry.entityId),
      entry.diff !== undefined ? JSON.stringify(entry.diff) : null,
      entry.ip ?? null,
    ]
  );
}

/**
 * Auditoría "mejor esfuerzo", para rutas donde el cambio YA se aplicó antes de
 * auditar (sin transacción común). Si el INSERT de auditoría fallara, `logAudit`
 * propagaba el error y el cliente recibía un 500 aunque el cambio estaba hecho:
 * al reintentar chocaba con el estado nuevo (p. ej. publicar → "no está en
 * revisión"). Aquí el fallo se reporta a Sentry y la petición sigue.
 *
 * Dentro de una transacción (`client.query.bind(client)`) usa `logAudit`, que
 * sí debe revertir el cambio si la auditoría falla.
 */
export async function logAuditBestEffort(runQuery: QueryFn, entry: AuditEntry): Promise<void> {
  try {
    await logAudit(runQuery, entry);
  } catch (error) {
    logError("❌ [Audit] No se pudo escribir la auditoría de un cambio ya aplicado", error, {
      action: entry.action,
      entityType: entry.entityType,
      entityId: String(entry.entityId),
    });
  }
}
