import bcrypt from "bcryptjs";
import { query } from "./db";

export type { UserSession } from "./session";

let dbInitPromise: Promise<void> | null = null;

/**
 * Inicializa automáticamente la tabla de usuarios en PostgreSQL si no existe.
 * Crea un usuario Admin predeterminado a partir de variables de entorno (si se proveen).
 *
 * Memoizada a nivel de módulo: en serverless cada instancia solo la ejecuta una vez
 * (en el primer request que la dispara), no en cada request que llega a esa instancia.
 */
export function initAuthDatabase(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = runAuthDatabaseInit().catch((error) => {
      // Si la inicialización falla, se permite reintentar en el próximo request
      // en vez de dejar la instancia atascada con una promesa rechazada para siempre.
      dbInitPromise = null;
      throw error;
    });
  }
  return dbInitPromise;
}

async function runAuthDatabaseInit() {
  try {
    // 1. Crear tabla de usuarios y leads
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        service VARCHAR(255),
        budget VARCHAR(100),
        currency VARCHAR(10) DEFAULT 'COP',
        estimated_weeks INTEGER DEFAULT 4,
        message TEXT,
        notes TEXT DEFAULT '',
        source VARCHAR(100) DEFAULT 'Cotizador Interactivo',
        status VARCHAR(50) DEFAULT 'Nuevo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_email VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        progress INTEGER DEFAULT 0,
        repo_url VARCHAR(255),
        staging_url VARCHAR(255),
        sla_warranty_start DATE,
        sla_warranty_end DATE,
        status VARCHAR(50) DEFAULT 'En Desarrollo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pendiente',
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Verificar si hay usuarios registrados
    const existingUsers = await query("SELECT COUNT(*) FROM users;");
    const count = parseInt(existingUsers.rows[0].count, 10);

    // 3. Crear usuario administrador por defecto si la base de datos está vacía
    //    y se proveyeron credenciales vía variables de entorno (nunca hardcodeadas).
    if (count === 0) {
      const seedEmail = process.env.ADMIN_SEED_EMAIL;
      const seedPassword = process.env.ADMIN_SEED_PASSWORD;

      if (!seedEmail || !seedPassword) {
        console.warn(
          "⚠️ [Auth DB] No hay usuarios en la base de datos y ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD no están configuradas. Defínelas para crear el primer usuario admin."
        );
        return;
      }

      const passwordHash = await bcrypt.hash(seedPassword, 10);

      await query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4);`,
        ["Administrador SKYCODE", seedEmail.trim().toLowerCase(), passwordHash, "admin"]
      );

      console.log(`✅ [Auth DB] Usuario admin inicial sembrado para ${seedEmail}.`);
    }
  } catch (error) {
    console.error("❌ [Auth DB Init Error]", error);
  }
}

/**
 * Compara contraseña plana con hash almacenado.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Genera hash de contraseña.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
