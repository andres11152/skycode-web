import { randomUUID } from "node:crypto";
import { query } from "./db";
import { ensureSeedAdmin, comparePassword } from "./auth";
import { createSessionToken } from "./session";
import { invalidateSessionCache } from "./authSession";
import { logAudit } from "./audit";
import { findUserByEmail, createSessionRecord, revokeSessionRecord } from "./queries/auth";

export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const DUMMY_HASH = "$2b$10$dummyhashfornonexistentusers1234567890";

export interface AuthenticateParams {
  email: string;
  password: string;
  ip: string;
  userAgent?: string | null;
}

export interface AuthSuccessResult {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

/**
 * Servicio de dominio para validar credenciales y crear la sesión del usuario.
 */
export async function authenticateUserCredentials({
  email,
  password,
  ip,
  userAgent,
}: AuthenticateParams): Promise<AuthSuccessResult | null> {
  // 1. Garantizar siembra de usuario administrador inicial en arranque de BD
  await ensureSeedAdmin();

  // 2. Buscar usuario por email
  const user = await findUserByEmail(email);

  // 3. Comparación constante de hash contra timing-attacks
  const passwordHashToCheck = user?.password_hash || DUMMY_HASH;
  const isValid = await comparePassword(password, passwordHashToCheck);

  if (!user || !isValid || user.status !== "active") {
    return null;
  }

  // 4. Crear registro de sesión en PostgreSQL
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await createSessionRecord({
    id: sessionId,
    userId: user.id,
    expiresAt,
    ip,
    userAgent,
  });

  // 5. Registrar en log de auditoría
  await logAudit(query, {
    actorId: user.id,
    actorEmail: user.email,
    action: "user.login",
    entityType: "session",
    entityId: sessionId,
    ip,
  });

  // 6. Firmar token JWT de sesión
  const token = await createSessionToken({ sessionId });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

/**
 * Servicio de dominio para cerrar sesión y revocar el token activo.
 */
export async function logoutUserSession(sessionId: string): Promise<boolean> {
  const revoked = await revokeSessionRecord(sessionId);
  invalidateSessionCache(sessionId);

  if (revoked) {
    await logAudit(query, {
      actorId: revoked.userId,
      actorEmail: revoked.email,
      action: "user.logout",
      entityType: "session",
      entityId: sessionId,
    });
    return true;
  }

  return false;
}
