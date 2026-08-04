import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { query } from "./db";

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "skycode_super_secret_jwt_key_2026_enterprise"
);

export interface UserSession {
  id: number | string;
  name: string;
  email: string;
  role: string;
}

/**
 * Inicializa automáticamente la tabla de usuarios en PostgreSQL si no existe.
 * Crea un usuario Admin predeterminado para pruebas.
 */
export async function initAuthDatabase() {
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
    if (count === 0) {
      const defaultEmail = "admin@skycode.agency";
      const defaultPassword = "admin123456"; // Contraseña inicial de prueba
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      await query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4);`,
        ["Administrador SKYCODE", defaultEmail, passwordHash, "admin"]
      );

      console.log("✅ [Auth DB] Tabla 'users' creada y usuario admin inicial sembrado:");
      console.log(`   Email: ${defaultEmail} | Password: ${defaultPassword}`);
    }
  } catch (error) {
    console.error("❌ [Auth DB Init Error]", error);
  }
}

/**
 * Genera un Token JWT firmado para la sesión del usuario.
 */
export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Válido por 7 días
    .sign(JWT_SECRET_KEY);
}

/**
 * Verifica y decodifica un Token JWT.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return {
      id: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (error) {
    return null;
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
