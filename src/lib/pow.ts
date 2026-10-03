import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

// Proof-of-work para las superficies de autenticación (login, 2FA,
// recuperación, invitaciones). Es el equivalente self-hosted de un CAPTCHA:
// no distingue personas de máquinas, hace que CADA intento automatizado
// cueste CPU real — y cada vez más a medida que acumula fallos. Un script que
// prueba credenciales a 1000 intentos/s con PoW de 22 bits pasa a ~1 intento
// cada varios segundos por núcleo; una persona real apenas lo nota (se
// resuelve en un Web Worker mientras escribe, ver lib/usePowChallenge.ts).
//
// Sin estado en el servidor: el reto va firmado (HMAC-SHA256, clave derivada
// de JWT_SECRET con HKDF) y trae su propia expiración. El único estado es el
// "un solo uso" (anti-replay), que lo lleva lib/authShield.ts en rate_limits.
//
// Esto SUBE EL COSTO de los bots; no detiene a granjas de personas ni a un
// atacante con mucho cómputo — por eso `verifyHumanChallenge` en authShield
// está pensado para sumar una segunda capa (ej. Turnstile) sin reescribir.

export const POW_MIN_BITS = 16;
export const POW_MAX_BITS = 24;
/** Un reto vive 2 minutos: da tiempo a resolver el de 24 bits en un teléfono lento. */
export const POW_TTL_MS = 120_000;
/** Un reto no se acepta antes de 1.5 s de emitido: un script que pide-y-envía al instante cae acá. */
export const POW_MIN_AGE_MS = 1_500;

/**
 * Edad mínima efectiva. Solo el servidor de la suite E2E (`SKYCODE_E2E=1`,
 * ver e2e/globalSetup.ts) puede acortarla con `AUTH_POW_MIN_AGE_MS`: cada
 * login de test pagaría 1.5 s de espera real y la suite (cientos de logins)
 * pasaría de ~2 a ~10 minutos. Fuera de ese modo la variable se ignora
 * por completo — configurarla por error en producción no debilita nada.
 */
export function getMinAgeMs(): number {
  if (process.env.SKYCODE_E2E === "1" && process.env.AUTH_POW_MIN_AGE_MS !== undefined) {
    const override = Number(process.env.AUTH_POW_MIN_AGE_MS);
    if (Number.isFinite(override) && override >= 0) return override;
  }
  return POW_MIN_AGE_MS;
}

let cachedKey: Buffer | null = null;

function getPowKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurada; el proof-of-work no puede firmar retos.");
  }
  // Clave separada de la que firma los JWT de sesión (HKDF con `info`
  // propio): un reto firmado nunca es válido como token de sesión ni al revés.
  cachedKey = Buffer.from(hkdfSync("sha256", secret, "skycode-pow-v1", "auth-proof-of-work", 32));
  return cachedKey;
}

interface PowPayload {
  /** Sal aleatoria (base64url) — también es el identificador de un solo uso. */
  salt: string;
  bits: number;
  iat: number;
  exp: number;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function sign(payloadB64: string): string {
  return toBase64Url(createHmac("sha256", getPowKey()).update(payloadB64).digest());
}

export interface IssuedChallenge {
  challenge: string;
  bits: number;
  minAgeMs: number;
}

export function clampBits(bits: number): number {
  return Math.min(POW_MAX_BITS, Math.max(POW_MIN_BITS, Math.floor(bits)));
}

export function issueChallenge(bits: number, now: number = Date.now()): IssuedChallenge {
  const payload: PowPayload = {
    salt: toBase64Url(randomBytes(16)),
    bits: clampBits(bits),
    iat: now,
    exp: now + POW_TTL_MS,
  };
  const payloadB64 = toBase64Url(Buffer.from(JSON.stringify(payload)));
  return { challenge: `${payloadB64}.${sign(payloadB64)}`, bits: payload.bits, minAgeMs: getMinAgeMs() };
}

/** Cantidad de bits en cero al inicio de un buffer (el "trabajo" demostrado por un hash). */
export function leadingZeroBits(buffer: Buffer): number {
  let bits = 0;
  for (const byte of buffer) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

export type PowFailureReason = "malformed" | "signature" | "expired" | "too_fast" | "invalid_solution" | "insufficient_work";

export type PowVerification =
  | { ok: true; id: string; bits: number }
  | { ok: false; reason: PowFailureReason };

/**
 * Verifica firma, vigencia, edad mínima y el trabajo en sí. NO comprueba el
 * "un solo uso": eso necesita estado (ver `consumeChallenge` en authShield).
 * El orden es deliberado — lo más barato primero y la firma antes de
 * calcular cualquier hash, para que basura sin firmar no cueste CPU.
 */
export function verifyChallengeSolution(challenge: string, solution: string, now: number = Date.now()): PowVerification {
  const parts = challenge.split(".");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) return { ok: false, reason: "malformed" };
  const [payloadB64, signature] = parts;

  const expected = Buffer.from(sign(payloadB64));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "signature" };
  }

  let payload: PowPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as PowPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload.salt !== "string" ||
    !Number.isFinite(payload.bits) ||
    !Number.isFinite(payload.iat) ||
    !Number.isFinite(payload.exp)
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (now >= payload.exp) return { ok: false, reason: "expired" };
  if (now - payload.iat < getMinAgeMs()) return { ok: false, reason: "too_fast" };
  if (!/^\d{1,15}$/.test(solution)) return { ok: false, reason: "invalid_solution" };

  const hash = createHash("sha256").update(`${payload.salt}:${solution}`).digest();
  if (leadingZeroBits(hash) < payload.bits) return { ok: false, reason: "insufficient_work" };

  return { ok: true, id: payload.salt, bits: payload.bits };
}

/**
 * Dificultad (en bits) según la "presión" reciente sobre la superficie: los
 * fallos de la IP o del identificador atacado, el que sea mayor. Sin
 * oráculo: el identificador cuenta aunque la cuenta no exista. La víctima de
 * un ataque distribuido nunca queda bloqueada — solo paga más CPU por
 * intento, igual que el atacante (pero uno intenta una vez, el otro miles).
 */
export function powBitsFor(pressure: number): number {
  if (pressure < 3) return 16;
  if (pressure < 6) return 19;
  if (pressure < 10) return 21;
  if (pressure < 15) return 23;
  return 24;
}

/** Resuelve un reto en Node. Solo para tests y para scripts/auth-attack-sim.mjs — el navegador usa public/pow-worker.js. */
export function solveChallenge(challenge: string): string {
  const [payloadB64] = challenge.split(".");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as PowPayload;
  for (let n = 0; ; n++) {
    const hash = createHash("sha256").update(`${payload.salt}:${n}`).digest();
    if (leadingZeroBits(hash) >= payload.bits) return String(n);
  }
}
