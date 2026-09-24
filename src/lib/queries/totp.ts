import { query } from "../db";
import { comparePassword, hashPassword } from "../auth";
import { generateBackupCodes, generateTotpSecret, verifyTotpCode } from "../totp";

export interface TotpStatus {
  enabled: boolean;
  /** Cuántos códigos de respaldo sin usar quedan — nunca se devuelven los
   * códigos mismos después de generarlos, solo la cantidad. */
  remainingBackupCodes: number;
}

export async function getTotpStatus(userId: number | string): Promise<TotpStatus> {
  const res = await query("SELECT totp_enabled, totp_backup_codes FROM users WHERE id = $1;", [userId]);
  const row = res.rows[0];
  if (!row) return { enabled: false, remainingBackupCodes: 0 };

  return {
    enabled: Boolean(row.totp_enabled),
    remainingBackupCodes: Array.isArray(row.totp_backup_codes) ? row.totp_backup_codes.length : 0,
  };
}

export interface TotpSetupData {
  secret: string;
}

/**
 * Genera y guarda un secreto NUEVO (reemplaza cualquiera anterior sin
 * confirmar) — `totp_enabled` se queda en `false` hasta que
 * `confirmTotpSetup()` reciba un código válido contra este mismo secreto.
 * Empezar de nuevo la configuración (ej. el usuario cerró la pantalla del
 * QR sin confirmar) simplemente sobreescribe el secreto pendiente, sin
 * dejar residuos.
 */
export async function startTotpSetup(userId: number | string): Promise<TotpSetupData> {
  const secret = generateTotpSecret();
  await query("UPDATE users SET totp_secret = $1, totp_enabled = false WHERE id = $2;", [secret, userId]);
  return { secret };
}

export interface ConfirmTotpResult {
  success: boolean;
  backupCodes?: string[];
}

/**
 * Confirma la configuración con un código real del teléfono y activa 2FA.
 * Genera los códigos de respaldo en el mismo paso — se devuelven en texto
 * plano UNA sola vez (la única vez que existen sin hashear fuera del
 * teléfono/papel del usuario); lo que queda en `users.totp_backup_codes`
 * es su hash bcrypt.
 */
export async function confirmTotpSetup(userId: number | string, code: string): Promise<ConfirmTotpResult> {
  const res = await query("SELECT totp_secret FROM users WHERE id = $1;", [userId]);
  const secret = res.rows[0]?.totp_secret;
  if (!secret || !verifyTotpCode(secret, code)) {
    return { success: false };
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((c) => hashPassword(c)));

  await query("UPDATE users SET totp_enabled = true, totp_backup_codes = $1 WHERE id = $2;", [hashedCodes, userId]);

  return { success: true, backupCodes };
}

/**
 * Desactiva 2FA por completo — exige un código válido (TOTP o de respaldo)
 * como última verificación, para que abrir sesión de otra persona con la
 * sesión ya iniciada no baste para apagar su segundo factor.
 */
export async function disableTotp(userId: number | string, code: string): Promise<boolean> {
  const isValid = await verifyTotpOrBackupCode(userId, code);
  if (!isValid) return false;

  await query("UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_backup_codes = NULL WHERE id = $1;", [userId]);
  return true;
}

/**
 * Reemplaza todos los códigos de respaldo por unos nuevos (los viejos
 * quedan inválidos de inmediato) — exige un código válido actual, mismo
 * criterio que `disableTotp`.
 */
export async function regenerateBackupCodes(userId: number | string, code: string): Promise<string[] | null> {
  const isValid = await verifyTotpOrBackupCode(userId, code);
  if (!isValid) return null;

  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((c) => hashPassword(c)));
  await query("UPDATE users SET totp_backup_codes = $1 WHERE id = $2;", [hashedCodes, userId]);

  return backupCodes;
}

/**
 * Verifica un código de 6 dígitos (TOTP) o un código de respaldo contra el
 * usuario indicado — usado tanto en el segundo paso del login como para
 * autorizar desactivar 2FA/regenerar códigos. Un código de respaldo
 * correcto se CONSUME (se borra del array) en la misma operación: son de
 * un solo uso.
 */
export async function verifyTotpOrBackupCode(userId: number | string, code: string): Promise<boolean> {
  const res = await query("SELECT totp_secret, totp_enabled, totp_backup_codes FROM users WHERE id = $1;", [userId]);
  const row = res.rows[0];
  if (!row || !row.totp_enabled || !row.totp_secret) return false;

  if (verifyTotpCode(row.totp_secret, code)) return true;

  const backupHashes: string[] = Array.isArray(row.totp_backup_codes) ? row.totp_backup_codes : [];
  const cleanCode = code.trim().toUpperCase();

  // Máximo 8 códigos — probarlos uno por uno (no en paralelo) porque el
  // primero que calce debe cortar el ciclo antes de seguir gastando CPU en
  // bcrypt.compare() para los demás.
  for (const hash of backupHashes) {
    if (await comparePassword(cleanCode, hash)) {
      const remaining = backupHashes.filter((h) => h !== hash);
      await query("UPDATE users SET totp_backup_codes = $1 WHERE id = $2;", [remaining, userId]);
      return true;
    }
  }

  return false;
}
