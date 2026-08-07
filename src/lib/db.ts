import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;
// Sin `export default pool` a propósito: esa exportación capturaría el valor
// de `pool` en el momento de evaluar el módulo (siempre `null`, porque
// `getPool()` lo asigna perezosamente después) — una trampa silenciosa para
// cualquier import futuro. Usa `query()` o `withTransaction()`.

/**
 * Crea el pool la primera vez que se necesita, no al importar el módulo.
 *
 * Mismo motivo que en lib/session.ts: `next build` importa los Route Handlers
 * para recolectar datos, y validar la variable de entorno a nivel de módulo
 * tumbaba el build en el hosting. Aquí la conexión se exige solo cuando
 * realmente se va a consultar la base.
 */
function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está configurada. Defínela en .env.local (desarrollo) o en las variables de entorno del hosting (producción)."
    );
  }

  const caCert = process.env.DATABASE_CA_CERT;
  // `NODE_ENV === "production"` no es un proxy confiable de "la base está en
  // Render y necesita SSL": `next start` (build de producción) pone
  // NODE_ENV=production sin importar a qué Postgres se apunte — incluida una
  // local sin SSL (el contenedor desechable de pruebas E2E, o el propio
  // `next start` de verificación local que ya pide CLAUDE.md, ahora que el
  // sitio sirve rutas de API reales en vez de export estático). Sin esto,
  // cualquier build de producción corrido contra una Postgres local rompía
  // con "The server does not support SSL connections" — bug real encontrado
  // al mover el server E2E de `next dev` a `next start`.
  const isLocalDb = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const isProdOrRender = !isLocalDb && (connectionString.includes("render.com") || process.env.NODE_ENV === "production");

  const sslConfig = caCert
    ? { rejectUnauthorized: true, ca: caCert }
    : isProdOrRender
    ? { rejectUnauthorized: false }
    : false;

  pool = new Pool({
    connectionString,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "production") {
      console.log("🐘 [PostgreSQL Query]", { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error("❌ [PostgreSQL Error]", { text, error });
    throw error;
  }
}

/**
 * Ejecuta `fn` dentro de una transacción, con rollback automático si algo
 * lanza. Reservado para escrituras que deben quedar todas o ninguna: en
 * este proyecto, el cambio de datos y la fila de `audit_log` que lo
 * documenta (si la auditoría no se pudo escribir, el cambio tampoco queda).
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
