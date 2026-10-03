import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";

// Hash de contraseñas con scrypt (RFC 7914) de `node:crypto`, sin dependencias.
//
// Por qué no bcryptjs para las contraseñas nuevas: es JavaScript puro y se
// ejecuta en el hilo principal. Medido en esta máquina, un `bcrypt.hash` de
// cost 12 (260 ms) detiene el event loop hasta ~98 ms seguidos; scrypt corre
// en el pool de hilos de libuv y el lag del event loop durante el hash fue de
// ~3 ms. En un endpoint público de login eso importa: cada intento (aun con
// credenciales inválidas) cuesta CPU, y con bcryptjs un atacante sin cuenta
// podía degradar todo el servidor solo enviando logins. scrypt además es
// memoria-dura (32 MiB por hash), lo que encarece el cracking con GPU/ASIC.
//
// Parámetros: N=2^15, r=8, p=3 — una de las combinaciones equivalentes que
// recomienda OWASP (Password Storage Cheat Sheet) para scrypt. ~180 ms y
// 32 MiB por verificación.

const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Margen sobre los 128·N·r bytes (32 MiB) que necesita el algoritmo; Node
// rechaza el cálculo si `maxmem` es menor.
const MAX_MEMORY = 128 * SCRYPT_N * SCRYPT_R * 2;

// Cotas al parsear un hash guardado: no es entrada del usuario, pero un
// valor corrupto en la fila no debe poder pedir memoria ilimitada.
const MAX_ACCEPTED_N = 1 << 20;
const MAX_ACCEPTED_R = 32;
const MAX_ACCEPTED_P = 16;

const scryptAsync = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

interface ParsedScrypt {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

function parseScryptHash(stored: string): ParsedScrypt | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  if (n < 2 || n > MAX_ACCEPTED_N || (n & (n - 1)) !== 0) return null;
  if (r < 1 || r > MAX_ACCEPTED_R || p < 1 || p > MAX_ACCEPTED_P) return null;

  const salt = Buffer.from(parts[4], "base64");
  const hash = Buffer.from(parts[5], "base64");
  if (salt.length === 0 || hash.length === 0) return null;

  return { n, r, p, salt, hash };
}

async function derive(plain: string, salt: Buffer, n: number, r: number, p: number, keyLength: number): Promise<Buffer> {
  return scryptAsync(plain, salt, keyLength, { N: n, r, p, maxmem: Math.max(MAX_MEMORY, 128 * n * r * 2) });
}

/** Hash de una contraseña nueva, con los parámetros vigentes. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(plain, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, KEY_LENGTH);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/**
 * Verifica una contraseña contra un hash guardado. Acepta scrypt (formato
 * propio) y bcrypt (`$2a$`/`$2b$`/`$2y$`, los hashes que existían antes de
 * esta migración — siguen funcionando y se re-hashean solos, ver
 * `needsRehash`). Un hash con formato irreconocible devuelve `false` sin
 * lanzar: nunca debe poder tumbar el login con un 500.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith("scrypt$")) {
    const parsed = parseScryptHash(stored);
    if (!parsed) return false;
    const candidate = await derive(plain, parsed.salt, parsed.n, parsed.r, parsed.p, parsed.hash.length);
    return candidate.length === parsed.hash.length && timingSafeEqual(candidate, parsed.hash);
  }

  if (/^\$2[aby]\$/.test(stored)) {
    return bcrypt.compare(plain, stored);
  }

  return false;
}

/** `true` si el hash guardado no es scrypt o usa parámetros más débiles que los vigentes. */
export function needsRehash(stored: string): boolean {
  const parsed = parseScryptHash(stored);
  if (!parsed) return true;
  return parsed.n < SCRYPT_N || parsed.r < SCRYPT_R || parsed.p < SCRYPT_P;
}

/**
 * Hash scrypt real y válido de una contraseña aleatoria descartada, con los
 * parámetros vigentes. Se usa como "señuelo" cuando el correo no existe, para
 * que ese camino ejecute el mismo trabajo que verificar una cuenta real (ver
 * `authenticateUserCredentials`). DEBE ser un hash bien formado: uno
 * malformado se rechazaría en microsegundos y reabriría el oráculo de timing
 * que esto existe para cerrar.
 */
export const DUMMY_SCRYPT_HASH =
  "scrypt$32768$8$3$QUJDREVGR0hJSktMTU5PUA==$260aHMJD98sJWXiEZwiwelbrO4j/AY5e4Yg9Hda1s9vo5HNQXYVakThc3YkXE1E73M0TTm381PUExCi7Do8wRw==";
