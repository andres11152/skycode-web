import { randomUUID } from "node:crypto";
import { query } from "./db";
import { ensureSeedAdmin, comparePassword } from "./auth";
import { createSessionToken, createPendingTwoFactorToken, verifyPendingTwoFactorToken } from "./session";
import { invalidateSessionCache } from "./authSession";
import { logAudit } from "./audit";
import { isRateLimited } from "./rateLimit";
import { findUserByEmail, createSessionRecord, revokeSessionRecord } from "./queries/auth";
import { verifyTotpOrBackupCode } from "./queries/totp";

export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// Hash bcrypt real (60 chars, cost 10) de una contraseña aleatoria descartada
// — DEBE ser un hash válido: uno con formato incorrecto hace que
// bcrypt.compare() falle por longitud/formato en <1ms en vez de ejecutar el
// work factor completo (~65ms), lo que reabre el oráculo de timing que esto
// existe para cerrar (un correo inexistente respondería visiblemente más
// rápido que uno real). Verificado con un benchmark real: con un hash
// malformado la relación era de ~1200x; con este, ambas rutas miden lo mismo.
export const DUMMY_HASH = "$2b$10$DHmTJ6VSGrz344hSNr9l/.3Eh7aLbuSCNolwzZ9z0lL8eeTBxoGXW";

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
  | { status: "invalid" }
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
  await createSessionRecord({ id: sessionId, userId: user.id, expiresAt, ip, userAgent });

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
  const isValid = await comparePassword(password, passwordHashToCheck);

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
    return { status: "invalid" };
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
