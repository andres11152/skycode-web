import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) implementado a mano sobre `node:crypto` — sin librería de
 * terceros (mismo criterio que `lib/bold.ts`/`lib/googleSearchConsole.ts`:
 * no sumar un SDK cuando el algoritmo real es corto y bien especificado).
 * Compatible con Google Authenticator, Authy, 1Password, etc. — todos
 * implementan exactamente este RFC con los mismos parámetros por defecto
 * (SHA1, 6 dígitos, período de 30s), que es lo que se usa acá.
 *
 * Verificado contra el vector de prueba oficial del Apéndice B de la RFC
 * (ver totp.test.ts): secreto ASCII "12345678901234567890", T=59s ->
 * código "287082" (el vector real de la RFC es de 8 dígitos, "94287082";
 * el de 6 dígitos es el mismo cálculo mod 10^6, ver comentario en el test).
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const SECRET_BYTES = 20; // 160 bits — mismo tamaño que usa Google Authenticator

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secreto base32 nuevo — se guarda en `users.totp_secret` hasta que el
 * usuario confirma el primer código (ver lib/queries/totp.ts). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

function hotp(secretBytes: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  const code = binCode % 10 ** TOTP_DIGITS;
  return code.toString().padStart(TOTP_DIGITS, "0");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function generateTotpCode(base32Secret: string, timeMs: number = Date.now()): string {
  const counter = Math.floor(Math.floor(timeMs / 1000) / TOTP_PERIOD_SECONDS);
  return hotp(base32Decode(base32Secret), counter);
}

/**
 * `window` = cuántos pasos de 30s hacia atrás/adelante se toleran, para
 * absorber el desfase normal de reloj entre el servidor y el teléfono del
 * usuario — 1 (± 30s) es el valor estándar que usan la mayoría de
 * implementaciones (incluida la guía de Google Authenticator).
 */
export function verifyTotpCode(base32Secret: string, code: string, window = 1, timeMs: number = Date.now()): boolean {
  const cleanCode = code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const counter = Math.floor(Math.floor(timeMs / 1000) / TOTP_PERIOD_SECONDS);
  const secretBytes = base32Decode(base32Secret);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = hotp(secretBytes, counter + errorWindow);
    if (timingSafeEqualStrings(candidate, cleanCode)) return true;
  }
  return false;
}

/**
 * URI `otpauth://` que cualquier app TOTP (Google Authenticator, Authy,
 * 1Password...) puede leer directo de un código QR — ver
 * lib/queries/totp.ts para dónde se renderiza como QR (paquete `qrcode`).
 */
export function buildOtpauthUri({ secret, accountLabel, issuer = "SkyCode.Agency" }: { secret: string; accountLabel: string; issuer?: string }): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

const BACKUP_CODE_COUNT = 8;

/**
 * Códigos de un solo uso para cuando el usuario pierde el teléfono con la
 * app de TOTP — formato "XXXXX-XXXXX" (10 caracteres hex en mayúscula,
 * legible al dictarlos o teclearlos a mano). Se muestran en texto plano
 * UNA sola vez al generarlos; lo que se guarda en base de datos es su
 * hash bcrypt (ver lib/queries/totp.ts), igual que una contraseña — son,
 * en la práctica, contraseñas de un solo uso.
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}
