import { BASE_URL } from "./config";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Resuelve el reto con EL MISMO código que ejecuta el navegador
 * (public/pow-worker.js, cargado con `new Function`) — así los e2e ejercitan
 * el SHA-256 real del worker, no un solver aparte, y a ~2.7 M hashes/s (un
 * reto de 21 bits en ~1 s; `crypto.createHash` por iteración es varias veces
 * más lento).
 */
const WORKER_SOURCE = readFileSync(path.join(import.meta.dirname, "..", "..", "public", "pow-worker.js"), "utf-8");

function solveChallenge(challenge: string): string {
  const payload = JSON.parse(Buffer.from(challenge.split(".")[0], "base64url").toString("utf-8")) as { salt: string; bits: number };
  const worker: { onmessage?: (event: { data: unknown }) => void; postMessage?: (message: unknown) => void } = {};
  let solution = "";
  worker.postMessage = (message) => {
    solution = (message as { solution?: string }).solution ?? "";
  };
  new Function("self", WORKER_SOURCE)(worker);
  worker.onmessage?.({ data: { salt: payload.salt, bits: payload.bits } });
  return solution;
}

type PowSurface = "login" | "verify-2fa" | "forgot-password" | "reset-password" | "team-accept";

/** Superficie de autenticación que corresponde a cada ruta que exige proof-of-work (ver lib/authShield.ts). */
const POW_SURFACE_BY_PATH: Record<string, PowSurface> = {
  "/api/auth/login": "login",
  "/api/auth/login/verify-2fa": "verify-2fa",
  "/api/auth/forgot-password": "forgot-password",
  "/api/auth/reset-password": "reset-password",
  "/api/team/accept": "team-accept",
};

/** Identificador con el que el servidor calcula la dificultad (mismo criterio que cada ruta). */
function powIdentifier(surface: PowSurface, body: Record<string, unknown>): string | undefined {
  if (surface === "verify-2fa" && typeof body.pendingToken === "string") {
    try {
      const payload = JSON.parse(Buffer.from(body.pendingToken.split(".")[1], "base64url").toString("utf-8"));
      return `user:${payload.pending2fa}`;
    } catch {
      return undefined;
    }
  }
  // El reto acepta identificadores de hasta 254 caracteres; un correo/token más
  // largo no es válido de todos modos, pero igual debe poder pedir su reto.
  if (typeof body.email === "string") return body.email.trim().toLowerCase().slice(0, 254);
  if (typeof body.token === "string") return body.token.trim().toLowerCase().slice(0, 254);
  return undefined;
}

/**
 * Cliente HTTP con jar de cookies manual — `fetch` no persiste cookies
 * entre llamadas como `curl -b/-c`, así que cada `TestClient` simula una
 * sesión de navegador propia (login → cookie httpOnly → requests
 * siguientes ya autenticados).
 */
function randomTestIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

export class TestClient {
  private cookies = new Map<string, string>();
  // IP simulada única por instancia — el rate limiter de /api/auth/login
  // agrupa por IP (ver lib/rateLimit.ts), y sin esto todos los TestClient
  // de la corrida compartirían el mismo bucket ("login:unknown", porque el
  // servidor de pruebas no recibe x-forwarded-for por defecto) y un test
  // agotaría el límite de otro.
  private readonly ip: string;

  constructor(ip: string = randomTestIp()) {
    this.ip = ip;
  }

  private applySetCookie(res: Response) {
    const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookieHeaders) {
      const pair = raw.split(";")[0];
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      this.cookies.set(name, value);
    }
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  /** `redirect: "manual"` a propósito — los tests de RBAC necesitan ver el 307 crudo, no que fetch lo siga solo. */
  async fetch(pathname: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const cookieHeader = this.cookieHeader();
    if (cookieHeader) headers.set("Cookie", cookieHeader);
    headers.set("x-forwarded-for", this.ip);
    // Las rutas de autenticación exigen evidencia same-origin (ver
    // lib/requestOrigin.ts): un navegador real siempre manda estas cabeceras.
    if (!headers.has("Origin")) headers.set("Origin", BASE_URL);
    if (!headers.has("Sec-Fetch-Site")) headers.set("Sec-Fetch-Site", "same-origin");
    const res = await fetch(`${BASE_URL}${pathname}`, { ...init, headers, redirect: "manual" });
    this.applySetCookie(res);
    return res;
  }

  get(pathname: string) {
    return this.fetch(pathname);
  }

  /** Pide un reto de proof-of-work al servidor y lo resuelve (como lo haría el Web Worker del navegador). */
  async solvePow(surface: PowSurface, identifier?: string): Promise<{ challenge: string; solution: string }> {
    const res = await this.fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface, identifier }),
    });
    if (!res.ok) throw new Error(`No se pudo obtener el reto de PoW: ${res.status} ${await res.text()}`);
    const { challenge, minAgeMs } = (await res.json()) as { challenge: string; minAgeMs: number };
    if (minAgeMs > 0) await new Promise((resolve) => setTimeout(resolve, minAgeMs + 20));
    return { challenge, solution: solveChallenge(challenge) };
  }

  /**
   * POST JSON. En las rutas de credenciales adjunta solo el proof-of-work
   * resuelto (como un navegador real) y, si el servidor responde
   * `pow_required` (dificultad subió por fallos previos), lo resuelve de nuevo
   * y reintenta. `{ withPow: false }` envía la petición CRUDA — para los tests
   * que justamente prueban qué pasa sin él.
   */
  async post(pathname: string, body?: unknown, options: { withPow?: boolean } = {}): Promise<Response> {
    const surface = POW_SURFACE_BY_PATH[pathname];
    const isObject = typeof body === "object" && body !== null && !Array.isArray(body);

    if (!surface || !isObject || options.withPow === false || "pow" in (body as Record<string, unknown>)) {
      return this.fetch(pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }

    const payload = body as Record<string, unknown>;
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const pow = await this.solvePow(surface, powIdentifier(surface, payload));
      res = await this.fetch(pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, pow }),
      });
      if (res.status !== 403) return res;
      const text = await res.clone().text();
      if (!text.includes("pow_required")) return res;
    }
    return res as Response;
  }

  patch(pathname: string, body?: unknown) {
    return this.fetch(pathname, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete(pathname: string) {
    return this.fetch(pathname, { method: "DELETE" });
  }

  hasCookie(name: string): boolean {
    return this.cookies.has(name);
  }

  /**
   * ¿Hay cookie de sesión? El servidor de pruebas corre `next start`
   * (NODE_ENV=production → nombre `__Host-skycode_session`), pero este
   * proceso corre bajo vitest (NODE_ENV=test), así que `SESSION_COOKIE_NAME`
   * importado acá daría el nombre equivocado. Se aceptan ambos.
   */
  hasSessionCookie(): boolean {
    return this.cookies.has("__Host-skycode_session") || this.cookies.has("skycode_session");
  }

  /** Fuerza una cookie de sesión inválida bajo ambos nombres posibles (ver `hasSessionCookie`). */
  setRawSessionCookie(value: string): void {
    this.cookies.set("__Host-skycode_session", value);
    this.cookies.set("skycode_session", value);
  }

  /** Para tests que necesitan forzar una cookie inválida/corrupta sin pasar por un login real. */
  setRawCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }
}

export async function loginAs(email: string, password: string): Promise<TestClient> {
  const client = new TestClient();
  const res = await client.post("/api/auth/login", { email, password });
  if (!res.ok) {
    throw new Error(`Login falló para ${email}: ${res.status} ${await res.text()}`);
  }
  return client;
}

/** Sufijo único por corrida de test — evita choques de email/UTM entre tests que no se limpian entre sí. */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
