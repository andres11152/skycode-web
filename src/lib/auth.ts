import bcrypt from "bcryptjs";
import { query } from "./db";

export type { UserSession } from "./session";

let seedPromise: Promise<void> | null = null;

/**
 * Siembra el primer usuario admin si la tabla `users` está vacía.
 *
 * El esquema (CREATE TABLE / ALTER TABLE) ya no vive acá — corría en la
 * ruta de cada request, lo que hacía cualquier cambio de columna en
 * producción una ruleta sin versionado ni forma de revertir. Ahora vive en
 * `db/migrations/`, aplicado explícitamente con `npm run db:migrate`. Esto
 * es lo único que queda en runtime porque es una escritura de datos, no de
 * esquema, y solo importa en el primerísimo arranque antes de que exista
 * ningún usuario.
 *
 * Memoizada a nivel de módulo: en serverless cada instancia solo la ejecuta
 * una vez (en el primer request que la dispara), no en cada request que
 * llega a esa instancia.
 */
export function ensureSeedAdmin(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runEnsureSeedAdmin().catch((error) => {
      // Si falla, se permite reintentar en el próximo request en vez de
      // dejar la instancia atascada con una promesa rechazada para siempre.
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function runEnsureSeedAdmin() {
  const existingUsers = await query("SELECT COUNT(*) FROM users;");
  const count = parseInt(existingUsers.rows[0].count, 10);
  if (count > 0) return;

  const seedEmail = process.env.ADMIN_SEED_EMAIL;
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!seedEmail || !seedPassword) {
    console.warn(
      "⚠️ [Auth] No hay usuarios en la base de datos y ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD no están configuradas. Defínelas para crear el primer usuario admin."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  await query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4);`,
    ["Administrador SKYCODE", seedEmail.trim().toLowerCase(), passwordHash, "admin"]
  );

  console.log(`✅ [Auth] Usuario admin inicial sembrado para ${seedEmail}.`);
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
