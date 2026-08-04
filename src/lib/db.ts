import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://invencheck_user:ESoPoD4WgmrP9bjQpUi5dgnJsBr0DEuV@dpg-d9hv88rrjlhs73dantdg-a.oregon-postgres.render.com/invencheck?sslmode=require";

// Configuración global del pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
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
