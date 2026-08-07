import { BASE_URL } from "./config";

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
    const res = await fetch(`${BASE_URL}${pathname}`, { ...init, headers, redirect: "manual" });
    this.applySetCookie(res);
    return res;
  }

  get(pathname: string) {
    return this.fetch(pathname);
  }

  post(pathname: string, body?: unknown) {
    return this.fetch(pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
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
