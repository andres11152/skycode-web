import { randomUUID } from "node:crypto";
import { query } from "./db";
import { ensureSeedAdmin } from "./auth";
import { DUMMY_SCRYPT_HASH, hashPassword, needsRehash, verifyPassword } from "./passwordHash";
import { createSessionToken, createPendingTwoFactorToken, verifyPendingTwoFactorToken } from "./session";
import { invalidateSessionCache } from "./authSession";
import { logAudit } from "./audit";
import { isRateLimited } from "./rateLimit";
import { findUserByEmail, createSessionRecord, revokeSessionRecord } from "./queries/auth";
import { verifyTotpOrBackupCode } from "./queries/totp";
import { logError } from "./logger";
import { detectNewDevice, fireAndLog, notifyNewDeviceLogin } from "./securityAlerts";

import { SESSION_LIFETIME_MS } from "./sessionCookie";
export { SESSION_LIFETIME_MS };

// Hash señuelo para cuando el correo no existe — ver DUMMY_SCRYPT_HASH en
// lib/passwordHash.ts (scrypt real con los parámetros vigentes, no uno
// malformado que se rechazaría al instante y reabriría el oráculo de timing).
export const DUMMY_HASH = DUMMY_SCRYPT_HASH;

export interface AuthenticateParams {
  email: string;
  password: string;
  ip: string;
  userAgent?: string | null;
}

export interface AuthUserPublic {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthSuccessResult {
  user: AuthUserPublic;
  token: string;
}

/**
 * Resultado discriminado del primer paso del login — antes devolvía
 * `AuthSuccessResult | null` directo. Con 2FA (ver lib/totp.ts) hace falta
 * un tercer estado intermedio: contraseña correcta, pero todavía no hay
 * sesión porque falta el código de 6 dígitos. `POST /api/auth/login`
 * traduce cada rama a su propia respuesta HTTP.
 */
export type AuthenticateResult =
  /** `userId` solo viene cuando el correo SÍ existe (para avisar al dueño); nunca llega al cliente. */
  | { status: "invalid"; userId: number | null }
  | { status: "needs_2fa"; pendingToken: string }
  | { status: "success"; user: AuthUserPublic; token: string };

/**
 * Crea la sesión real (fila en `sessions` + JWT firmado + entrada de
 * auditoría) — compartido entre el login directo (sin 2FA) y el segundo
 * paso del login con 2FA, para no duplicar esta lógica en dos sitios.
 */
async function createSessionForUser(user: AuthUserPublic, ip: string, userAgent?: string | null): Promise<AuthSuccessResult> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  // Debe evaluarse ANTES de insertar la sesión nueva (si no, siempre
  // "conocería" el dispositivo). Un fallo de la consulta nunca bloquea el login.
  const isNewDevice = await detectNewDevice(user.id, userAgent).catch((error) => {
    logError("⚠️ [Auth] detectNewDevice falló", error, { userId: user.id });
    return false;
  });

  await createSessionRecord({ id: sessionId, userId: user.id, expiresAt, ip, userAgent });

  if (isNewDevice) fireAndLog("nuevo dispositivo", notifyNewDeviceLogin({ userId: user.id, ip, userAgent }));

  await logAudit(query, {
    actorId: user.id,
    actorEmail: user.email,
    action: "user.login",
    entityType: "session",
    entityId: sessionId,
    ip,
  });

  const token = await createSessionToken({ sessionId });
  return { user, token };
}

/**
 * Servicio de dominio para validar credenciales — primer paso del login.
 * Si el usuario tiene 2FA activo, se detiene acá (`needs_2fa`) sin crear
 * sesión; `verifyTwoFactorAndCreateSession()` es el segundo paso.
 */
export async function authenticateUserCredentials({ email, password, ip, userAgent }: AuthenticateParams): Promise<AuthenticateResult> {
  // 1. Garantizar siembra de usuario administrador inicial en arranque de BD
  await ensureSeedAdmin();

  // 2. Buscar usuario por email
  const user = await findUserByEmail(email);

  // 3. Comparación constante de hash contra timing-attacks
  const passwordHashToCheck = user?.password_hash || DUMMY_HASH;
  const isValid = await verifyPassword(password, passwordHashToCheck);

  if (!user || !isValid || user.status !== "active") {
    // Se audita el intento fallido (nunca la contraseña en sí) para que
    // `/dashboard/auditoria` muestre fuerza bruta o cuentas objetivo — sin
    // esto, un atacante podía intentar miles de credenciales sin dejar
    // ningún rastro más allá de las métricas del rate limiter en memoria.
    // `actorId: null` cuando el email no corresponde a ningún usuario real
    // (no hay fila que referenciar); `actorEmail` sigue siendo el correo
    // intentado, exista o no, porque es lo único identificable del intento.
    await logAudit(query, {
      actorId: user?.id ?? null,
      actorEmail: email,
      action: "user.login_failed",
      entityType: "user",
      entityId: user?.id ?? email,
      ip,
    });
    return { status: "invalid", userId: user?.id ?? null };
  }

  // Migración transparente de hash: una cuenta con hash bcrypt (o scrypt con
  // parámetros más débiles) se re-hashea con los vigentes ahora que tenemos
  // la contraseña en claro y acaba de verificarse. Mejor esfuerzo: un fallo
  // acá no debe impedir el login.
  if (needsRehash(user.password_hash)) {
    try {
      await query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2;", [await hashPassword(password), user.id]);
    } catch (error) {
      logError("⚠️ [Auth] No se pudo re-hashear la contraseña", error, { userId: user.id });
    }
  }

  const publicUser: AuthUserPublic = { id: user.id, name: user.name, email: user.email, role: user.role };

  if (user.totp_enabled) {
    const pendingToken = await createPendingTwoFactorToken(user.id);
    return { status: "needs_2fa", pendingToken };
  }

  const { token } = await createSessionForUser(publicUser, ip, userAgent);
  return { status: "success", user: publicUser, token };
}

export interface VerifyTwoFactorParams {
  pendingToken: string;
  code: string;
  ip: string;
  userAgent?: string | null;
}

/**
 * Segundo paso del login cuando `authenticateUserCredentials` devolvió
 * `needs_2fa`. Acepta tanto un código TOTP de 6 dígitos como un código de
 * respaldo (ver `verifyTotpOrBackupCode`) — no distingue cuál llegó, así
 * que el formulario de login puede aceptar cualquiera de los dos sin que
 * el usuario tenga que indicar cuál está usando.
 */
export async function verifyTwoFactorAndCreateSession({ pendingToken, code, ip, userAgent }: VerifyTwoFactorParams): Promise<AuthSuccessResult | null> {
  const userId = await verifyPendingTwoFactorToken(pendingToken);
  if (!userId) return null;

  // Límite por usuario, además del límite por IP que ya aplica la ruta: un
  // código de 6 dígitos tiene poquísima entropía, así que rotar IPs contra
  // la MISMA cuenta objetivo debía quedar igual de bloqueado que insistir
  // desde la misma IP. No sustituye el límite por IP (uno cubre "un
  // atacante contra muchas cuentas", el otro "muchas fuentes contra una
  // cuenta") — ambos deben evadirse a la vez.
  if (await isRateLimited(`login-2fa-user:${userId}`, 5, 10 * 60 * 1000)) {
    return null;
  }

  const res = await query("SELECT id, name, email, role, status FROM users WHERE id = $1;", [userId]);
  const row = res.rows[0];
  if (!row || row.status !== "active") return null;

  const isValidCode = await verifyTotpOrBackupCode(userId, code);
  if (!isValidCode) {
    await logAudit(query, {
      actorId: Number(row.id),
      actorEmail: String(row.email),
      action: "user.2fa_failed",
      entityType: "user",
      entityId: Number(row.id),
      ip,
    });
    return null;
  }

  const publicUser: AuthUserPublic = { id: Number(row.id), name: String(row.name), email: String(row.email), role: String(row.role) };
  return createSessionForUser(publicUser, ip, userAgent);
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
