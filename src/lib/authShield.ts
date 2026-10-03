import { NextResponse } from "next/server";
import { query } from "./db";
import { logAudit } from "./audit";
import { getClientIp } from "./clientIp";
import { incrementAttempts, peekAttempts, resetAttempts } from "./rateLimit";
import { isSameOriginAuthRequest } from "./requestOrigin";
import { jsonBodyErrorResponse, readJsonBody } from "./readJsonBody";
import { POW_MIN_BITS, POW_TTL_MS, issueChallenge, powBitsFor, verifyChallengeSolution, type IssuedChallenge } from "./pow";
import { logError } from "./logger";

/**
 * Defensa compartida de TODAS las superficies que aceptan credenciales
 * (login, 2FA, olvidé/resetear contraseña, aceptar invitación). Un solo
 * módulo a propósito: si cada ruta implementara su propia defensa, un
 * atacante simplemente atacaría la menos protegida. Ver docs/auth-hardening.md.
 *
 * Capas, en el orden en que se aplican (de la más barata a la más cara, y
 * cortando en la primera que falla — basura sin firma nunca llega a la base):
 *   1. Origen estricto (same-origin) y forma del cuerpo       → guardAuthRequest
 *   2. Bloqueo duro por IP con demasiados fallos recientes    → guardAuthRequest
 *   3. Honeypot                                               → verifyHumanChallenge
 *   4. Proof-of-work firmado, de un solo uso y adaptativo     → verifyHumanChallenge
 *   5. Piso de duración por intento                           → withMinimumDuration
 *   6. Contadores de fallos que alimentan 2 y 4               → recordAuthFailure
 *
 * (Antes de todo esto, proxy.ts descarta ráfagas con un token bucket en
 * memoria, sin tocar ni el handler ni la base.)
 */

export type AuthSurface = "login" | "verify-2fa" | "forgot-password" | "reset-password" | "team-accept";

export const AUTH_SURFACES: readonly AuthSurface[] = ["login", "verify-2fa", "forgot-password", "reset-password", "team-accept"];

/** Superficies donde "fallo" tiene sentido (credencial/código incorrectos); en el resto se cuenta cada petición. */
const FAILURE_SURFACES = new Set<AuthSurface>(["login", "verify-2fa"]);

const WINDOW_MS = 15 * 60 * 1000;
/** Fallos de una IP (en 15 min) a partir de los cuales se bloquea de forma dura. */
export const IP_HARD_BLOCK_FAILURES = 20;
/** Fallos de un par correo+IP a partir de los cuales se bloquea de forma dura. */
export const PAIR_HARD_BLOCK_FAILURES = 8;
/**
 * Piso de duración de un intento de login. Iguala los tiempos de "correo
 * inexistente" / hash bcrypt heredado / hash scrypt (distintos entre sí por
 * decenas de ms), cerrando el oráculo de timing, y encarece la fuerza bruta.
 * Es una espera, no un cómputo: no ocupa CPU.
 */
export const LOGIN_MIN_DURATION_MS = 450;

/** Igual que `getMinAgeMs` en lib/pow.ts: solo el servidor E2E puede acortar el piso (cada login de test no debe pagar 450 ms). */
export function loginMinDurationMs(): number {
  if (process.env.SKYCODE_E2E === "1" && process.env.AUTH_MIN_DURATION_MS !== undefined) {
    const override = Number(process.env.AUTH_MIN_DURATION_MS);
    if (Number.isFinite(override) && override >= 0) return override;
  }
  return LOGIN_MIN_DURATION_MS;
}

const GENERIC_RATE_LIMIT_MESSAGE = "Demasiados intentos. Intente de nuevo en unos minutos.";

/**
 * Normaliza un identificador (correo, token…) para usarlo como parte de la
 * CLAVE de un contador. Quita los caracteres de control: Postgres rechaza el
 * NUL (`\u0000`) en un parámetro de texto con "invalid byte sequence"
 * (código 22021), y esa excepción subía como un 500 — hallazgo real del test
 * de entradas hostiles (e2e/auth-shield.e2e.test.ts), que mandaba un NUL en
 * el `identifier` del reto.
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier.replace(/[\u0000-\u001f\u007f]/g, "").trim().toLowerCase().slice(0, 254);
}

const failIpKey = (ip: string) => `authfail-ip:${ip}`;
const failIdKey = (surface: AuthSurface, id: string) => `authfail-id:${surface}:${normalizeIdentifier(id)}`;
const failPairKey = (id: string, ip: string) => `authfail-pair:${normalizeIdentifier(id)}:${ip}`;
const requestKey = (surface: AuthSurface, ip: string) => `authreq:${surface}:${ip}`;

/**
 * Evita llenar `audit_log` durante una inundación: registra el evento solo
 * la primera vez por clave en la ventana (reutiliza `rate_limits` como
 * dedupe, sin tabla nueva).
 */
async function auditOncePerWindow(dedupeKey: string, entry: Parameters<typeof logAudit>[1]): Promise<void> {
  try {
    if ((await incrementAttempts(`auditonce:${dedupeKey}`, WINDOW_MS)) === 1) {
      await logAudit(query, entry);
    }
  } catch (error) {
    // La auditoría de un evento de defensa nunca debe tumbar la defensa.
    logError("⚠️ [AuthShield] no se pudo auditar", error);
  }
}

function rateLimited(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: GENERIC_RATE_LIMIT_MESSAGE },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export type GuardResult =
  | { ok: true; ip: string; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/**
 * Capas 1 y 2: origen estricto, forma del cuerpo y bloqueo duro por IP.
 * Devuelve el cuerpo ya parseado (objeto JSON) para que la ruta lo valide
 * con su propio esquema Zod.
 */
export async function guardAuthRequest(request: Request, surface: AuthSurface): Promise<GuardResult> {
  if (!isSameOriginAuthRequest(request.headers)) {
    return { ok: false, response: NextResponse.json({ error: "Origen no autorizado." }, { status: 403 }) };
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return { ok: false, response: jsonBodyErrorResponse(parsed) };
  if (typeof parsed.data !== "object" || parsed.data === null || Array.isArray(parsed.data)) {
    return { ok: false, response: NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 }) };
  }

  const ip = getClientIp(request);

  if (FAILURE_SURFACES.has(surface) && ip !== "unknown") {
    const ipFailures = await peekAttempts(failIpKey(ip), WINDOW_MS);
    if (ipFailures >= IP_HARD_BLOCK_FAILURES) {
      await auditOncePerWindow(`blocked:${surface}:${ip}`, {
        actorId: null,
        actorEmail: "anon",
        action: "user.login_blocked",
        entityType: "ip",
        entityId: ip,
        diff: { surface, failures: ipFailures },
        ip,
      });
      return { ok: false, response: rateLimited(15 * 60) };
    }
  }

  return { ok: true, ip, body: parsed.data as Record<string, unknown> };
}

/**
 * Bits de dificultad que HOY se exigen a esta IP + identificador. En
 * superficies con "fallo" (login, 2FA) la presión son los fallos recientes
 * (de la IP o del identificador atacado, sin importar si la cuenta existe →
 * sin oráculo). En el resto, las peticiones recientes de la IP.
 */
export async function requiredPowBits(surface: AuthSurface, ip: string, identifier?: string | null): Promise<number> {
  if (FAILURE_SURFACES.has(surface)) {
    const [ipFailures, idFailures] = await Promise.all([
      ip === "unknown" ? 0 : peekAttempts(failIpKey(ip), WINDOW_MS),
      identifier ? peekAttempts(failIdKey(surface, identifier), WINDOW_MS) : 0,
    ]);
    return powBitsFor(Math.max(ipFailures, idFailures));
  }
  const requests = ip === "unknown" ? 0 : await peekAttempts(requestKey(surface, ip), WINDOW_MS);
  return powBitsFor(requests);
}

export async function issueChallengeFor(surface: AuthSurface, ip: string, identifier?: string | null): Promise<IssuedChallenge> {
  return issueChallenge(await requiredPowBits(surface, ip, identifier));
}

export type HumanGateResult =
  | { ok: true }
  | { ok: false; kind: "honeypot" }
  | { ok: false; kind: "pow"; response: NextResponse };

function powRequired(difficulty: number): HumanGateResult {
  return {
    ok: false,
    kind: "pow",
    response: NextResponse.json(
      { error: "Verificación de seguridad requerida.", code: "pow_required", difficulty },
      { status: 403 },
    ),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Capas 3 y 4: honeypot + proof-of-work. `body.website` es el campo señuelo
 * (oculto a personas, visible para bots que rellenan todo); `body.pow` trae
 * `{ challenge, solution }`. Es el punto de extensión para sumar una segunda
 * capa (ej. Cloudflare Turnstile): bastaría agregar acá su verificación sin
 * tocar las rutas.
 *
 * Los fallos de PoW NO tocan la base mientras la solución no sea válida:
 * firma, vigencia y trabajo se comprueban con CPU pura primero, así basura o
 * un reto vencido no cuesta ni una consulta. Solo una solución válida llega
 * a leer los contadores y a marcar el reto como usado (un solo uso).
 */
export async function verifyHumanChallenge(input: {
  surface: AuthSurface;
  ip: string;
  identifier?: string | null;
  body: Record<string, unknown>;
}): Promise<HumanGateResult> {
  const { surface, ip, identifier, body } = input;

  if (isNonEmptyString(body.website)) {
    await auditOncePerWindow(`honeypot:${surface}:${ip}`, {
      actorId: null,
      actorEmail: "anon",
      action: "user.honeypot_triggered",
      entityType: "ip",
      entityId: ip,
      diff: { surface },
      ip,
    });
    return { ok: false, kind: "honeypot" };
  }

  const pow = body.pow;
  const challenge = typeof pow === "object" && pow !== null ? (pow as Record<string, unknown>).challenge : undefined;
  const solution = typeof pow === "object" && pow !== null ? (pow as Record<string, unknown>).solution : undefined;
  if (!isNonEmptyString(challenge) || !isNonEmptyString(solution) || challenge.length > 600 || solution.length > 20) {
    return powRequired(POW_MIN_BITS);
  }

  const verification = verifyChallengeSolution(challenge, solution);
  if (!verification.ok) {
    if (surface === "login" && verification.reason !== "expired") {
      await auditOncePerWindow(`powfail:${ip}`, {
        actorId: null,
        actorEmail: "anon",
        action: "user.login_challenge_failed",
        entityType: "ip",
        entityId: ip,
        diff: { reason: verification.reason },
        ip,
      });
    }
    return powRequired(POW_MIN_BITS);
  }

  const required = await requiredPowBits(surface, ip, identifier);
  if (verification.bits < required) return powRequired(required);

  // Un solo uso: el primer canje de este reto marca la clave; cualquier otro
  // (replay del mismo `challenge`+`solution` capturado) cuenta > 1 y se rechaza.
  if ((await incrementAttempts(`pow-used:${verification.id}`, POW_TTL_MS + 60_000)) > 1) {
    return powRequired(required);
  }

  if (!FAILURE_SURFACES.has(surface) && ip !== "unknown") {
    await incrementAttempts(requestKey(surface, ip), WINDOW_MS);
  }

  return { ok: true };
}

export interface FailureCounts {
  ipFailures: number;
  idFailures: number;
  pairFailures: number;
}

/** Registra un intento fallido (credencial o código incorrectos). */
export async function recordAuthFailure(input: { surface: AuthSurface; ip: string; identifier: string }): Promise<FailureCounts> {
  const { surface, ip, identifier } = input;
  const [ipFailures, idFailures, pairFailures] = await Promise.all([
    ip === "unknown" ? Promise.resolve(0) : incrementAttempts(failIpKey(ip), WINDOW_MS),
    incrementAttempts(failIdKey(surface, identifier), WINDOW_MS),
    incrementAttempts(failPairKey(identifier, ip), WINDOW_MS),
  ]);
  return { ipFailures, idFailures, pairFailures };
}

/**
 * Un acceso correcto limpia los fallos de ESE identificador (la persona
 * legítima que por fin acertó no arrastra el castigo). Los de la IP no se
 * tocan: quien posee una cuenta propia no debe poder "lavar" así los fallos
 * de sus ataques a otras.
 */
export async function recordAuthSuccess(input: { surface: AuthSurface; ip: string; identifier: string }): Promise<void> {
  await Promise.all([resetAttempts(failIdKey(input.surface, input.identifier)), resetAttempts(failPairKey(input.identifier, input.ip))]);
}

/** ¿Este par correo+IP ya acumuló demasiados fallos? Bloqueo duro SOLO del par: nunca de la cuenta entera. */
export async function isPairBlocked(identifier: string, ip: string): Promise<boolean> {
  return (await peekAttempts(failPairKey(identifier, ip), WINDOW_MS)) >= PAIR_HARD_BLOCK_FAILURES;
}

export function pairBlockedResponse(): NextResponse {
  return rateLimited(15 * 60);
}

/**
 * Ejecuta `fn` y no responde antes de `minMs`, aunque `fn` termine antes
 * (incluso si lanza). La espera no ocupa CPU (es un `setTimeout`).
 */
export async function withMinimumDuration<T>(minMs: number, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    const remaining = minMs - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
