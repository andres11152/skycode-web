import { Pool } from "pg";

let pool: Pool | null = null;

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

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("render.com") || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
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

export default pool;
