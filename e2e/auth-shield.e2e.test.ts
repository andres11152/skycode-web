import { beforeEach, describe, expect, it } from "vitest";
import { TestClient } from "./helpers/client";
import { BASE_URL } from "./helpers/config";
import { createTestSession, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

const PASSWORD = "SuperSecret123456";

beforeEach(async () => {
  await resetTestDb();
});

/** Siembra un contador de fallos directo en rate_limits (resolver cientos de PoW de 24 bits para llegar al umbral no aporta nada). */
async function seedCounter(key: string, count: number) {
  await query(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET count = $2, window_start = now();`,
    [key, count],
  );
}

async function issueBits(client: TestClient, surface: string, identifier?: string): Promise<number> {
  const res = await client.fetch("/api/auth/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface, identifier }),
  });
  expect(res.status).toBe(200);
  return (await res.json()).bits;
}

describe("Proof-of-work en el login", () => {
  it("sin proof-of-work: 403 pow_required (no se verifica la contraseña)", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const res = await new TestClient().post("/api/auth/login", { email: user.email, password: PASSWORD }, { withPow: false });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("pow_required");
  });

  it("con proof-of-work válido el login funciona", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const res = await new TestClient().post("/api/auth/login", { email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it("un proof-of-work NO se puede reutilizar (replay)", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = new TestClient();
    const pow = await client.solvePow("login", user.email);

    const first = await client.post("/api/auth/login", { email: user.email, password: PASSWORD, pow }, { withPow: false });
    expect(first.status).toBe(200);

    const replay = await new TestClient().post("/api/auth/login", { email: user.email, password: PASSWORD, pow }, { withPow: false });
    expect(replay.status).toBe(403);
    expect((await replay.json()).code).toBe("pow_required");
  });

  it("una firma alterada (bajar la dificultad) se rechaza", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = new TestClient();
    const { challenge } = await client.solvePow("login", user.email);
    const [payloadB64, signature] = challenge.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    payload.bits = 1;
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;

    const res = await client.post(
      "/api/auth/login",
      { email: user.email, password: PASSWORD, pow: { challenge: forged, solution: "0" } },
      { withPow: false },
    );
    expect(res.status).toBe(403);
  });

  it("la dificultad SUBE con los fallos del correo atacado, exista o no la cuenta (sin oráculo)", async () => {
    const client = new TestClient();
    expect(await issueBits(client, "login", "nadie@test.local")).toBe(16);

    await seedCounter("authfail-id:login:nadie@test.local", 12);
    expect(await issueBits(client, "login", "nadie@test.local")).toBe(23);

    // Un correo REAL con los mismos fallos recibe exactamente la misma dificultad.
    const user = await createTestUser({ password: PASSWORD });
    await seedCounter(`authfail-id:login:${user.email}`, 12);
    expect(await issueBits(client, "login", user.email)).toBe(23);
  });

  it("un ataque distribuido contra una cuenta NO bloquea a la víctima: solo le sube el costo", async () => {
    const user = await createTestUser({ password: PASSWORD });
    await seedCounter(`authfail-id:login:${user.email}`, 40); // cientos de IPs distintas intentando

    const victim = new TestClient();
    const res = await victim.post("/api/auth/login", { email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
  }, 60_000);

  it("una IP con 20 fallos recientes queda bloqueada de forma dura (429)", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = new TestClient("10.77.0.1");
    await seedCounter("authfail-ip:10.77.0.1", 20);

    const res = await client.post("/api/auth/login", { email: user.email, password: PASSWORD }, { withPow: false });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("un login exitoso limpia los fallos del correo", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = new TestClient();
    await seedCounter(`authfail-id:login:${user.email}`, 4);

    expect((await client.post("/api/auth/login", { email: user.email, password: PASSWORD })).status).toBe(200);
    expect(await issueBits(new TestClient(), "login", user.email)).toBe(16);
  });
});

describe("Honeypot", () => {
  it("rellenar el campo señuelo da la MISMA respuesta que una credencial inválida (aunque la contraseña sea correcta)", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = new TestClient();
    const res = await client.post("/api/auth/login", { email: user.email, password: PASSWORD, website: "http://spam.example" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Credenciales de acceso no válidas." });
    expect(client.hasSessionCookie()).toBe(false);

    const audit = await query(`SELECT action FROM audit_log WHERE action = 'user.honeypot_triggered';`);
    expect(audit.rows).toHaveLength(1);
  });
});

describe("Forma de la petición y origen", () => {
  it("JSON roto: 400, no 500", async () => {
    const res = await new TestClient().fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{esto no es json",
    });
    expect(res.status).toBe(400);
  });

  it("Content-Type distinto de JSON: 415", async () => {
    const res = await new TestClient().fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "email=a@b.com&password=x",
    });
    expect(res.status).toBe(415);
  });

  it("cuerpo gigante: 413 sin cargarlo entero", async () => {
    const res = await new TestClient().fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "x".repeat(50_000) }),
    });
    expect(res.status).toBe(413);
  });

  it("cuerpo que no es un objeto (array, número, null): 400", async () => {
    for (const body of ["[]", "123", "null", '"texto"']) {
      const res = await new TestClient().fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      expect(res.status).toBe(400);
    }
  });

  it("sin Origin ni Sec-Fetch-Site (un script suelto, curl): 403", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.50.0.1" },
      body: JSON.stringify({ email: "a@b.com", password: "x" }),
    });
    expect(res.status).toBe(403);
  });

  it("Origin de otro sitio: 403 (también en el reto)", async () => {
    for (const pathname of ["/api/auth/login", "/api/auth/challenge"]) {
      const res = await new TestClient().fetch(pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
        body: JSON.stringify({ surface: "login", email: "a@b.com", password: "x" }),
      });
      expect(res.status).toBe(403);
    }
  });
});

describe("Entradas hostiles: ninguna provoca un 500", () => {
  const PAYLOADS = [
    "' OR '1'='1",
    "admin'--",
    "'; DROP TABLE users;--",
    "\" OR \"\"=\"",
    "1; SELECT pg_sleep(5)--",
    "{\"$ne\":null}",
    "a@b.com\u0000",
    "\u0000",
    "ａｄｍｉｎ＠ｔｅｓｔ.com",
    "A".repeat(300),
    "<script>alert(1)</script>@x.com",
    "%00%27%20OR%201=1",
  ];

  it("correo y contraseña con payloads de SQLi/NoSQLi/NUL/unicode devuelven 400 o 401", async () => {
    // Un TestClient (= una IP simulada) por intento: con una sola IP, a los 20
    // fallos entra el bloqueo duro por IP (429) — comportamiento correcto, pero
    // aquí lo que se mide es que ninguna entrada hostil llegue a un 500.
    for (const payload of PAYLOADS) {
      const asEmail = await new TestClient().post("/api/auth/login", { email: payload, password: "x" });
      expect([400, 401]).toContain(asEmail.status);

      const asPassword = await new TestClient().post("/api/auth/login", { email: "nadie@test.local", password: payload });
      expect([400, 401]).toContain(asPassword.status);
    }
  }, 120_000);

  it("la tabla de usuarios sigue intacta tras los payloads", async () => {
    await createTestUser({ password: PASSWORD });
    const client = new TestClient();
    await client.post("/api/auth/login", { email: "'; DROP TABLE users;--", password: "x" });
    const count = await query("SELECT COUNT(*)::int AS n FROM users;");
    expect(count.rows[0].n).toBe(1);
  });
});

describe("Cookie de sesión y cabeceras", () => {
  it("la cookie sale con el prefijo __Host- y los atributos que éste exige", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const res = await new TestClient().post("/api/auth/login", { email: user.email, password: PASSWORD });
    const cookie = res.headers.getSetCookie().find((c) => c.includes("skycode_session"));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/^__Host-skycode_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it("las rutas de auth no se cachean y llevan COOP/CORP", async () => {
    const res = await new TestClient().fetch("/login");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(res.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(res.headers.get("content-security-policy")).toContain("worker-src 'self'");

    const api = await new TestClient().fetch("/api/auth/me");
    expect(api.headers.get("cache-control")).toContain("no-store");
  });
});

describe("Otras superficies de credenciales exigen el mismo proof-of-work", () => {
  it("forgot-password sin PoW: 403 pow_required", async () => {
    const res = await new TestClient().post("/api/auth/forgot-password", { email: "a@b.com" }, { withPow: false });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("pow_required");
  });

  it("reset-password sin PoW: 403 pow_required", async () => {
    const res = await new TestClient().post(
      "/api/auth/reset-password",
      { token: "00000000-0000-4000-8000-000000000000", password: "UnaContraseñaSegura123" },
      { withPow: false },
    );
    expect(res.status).toBe(403);
  });

  it("team/accept sin PoW: 403 pow_required", async () => {
    const res = await new TestClient().post(
      "/api/team/accept",
      { token: "00000000-0000-4000-8000-000000000000", name: "X Y", password: "UnaContraseñaSegura123" },
      { withPow: false },
    );
    expect(res.status).toBe(403);
  });

  it("verify-2fa con un pendingToken falso: 401 sin pedir proof-of-work", async () => {
    const res = await new TestClient().post("/api/auth/login/verify-2fa", { pendingToken: "no-es-un-jwt", code: "123456" }, { withPow: false });
    expect(res.status).toBe(401);
  });

  it("el honeypot en forgot-password responde igual que una solicitud normal (sin crear tokens)", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const res = await new TestClient().post("/api/auth/forgot-password", { email: user.email, website: "x" });
    expect(res.status).toBe(200);
    const tokens = await query("SELECT COUNT(*)::int AS n FROM password_resets;");
    expect(tokens.rows[0].n).toBe(0);
  });
});


const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";

/** Los avisos de seguridad se envían sin bloquear el login (fire-and-forget): se espera a que aparezcan. */
async function waitForNotifications(userId: number, expected: number): Promise<{ title: string; body: string }[]> {
  for (let i = 0; i < 40; i++) {
    const res = await query("SELECT title, body FROM notifications WHERE user_id = $1 ORDER BY id;", [userId]);
    if (res.rows.length >= expected) return res.rows;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return (await query("SELECT title, body FROM notifications WHERE user_id = $1 ORDER BY id;", [userId])).rows;
}

describe("Avisos de seguridad al dueño de la cuenta", () => {
  it("un login desde un dispositivo nunca visto crea una notificación", async () => {
    const user = await createTestUser({ password: PASSWORD });
    await createTestSession(user.id, { userAgent: CHROME_MAC });

    const client = new TestClient();
    const pow = await client.solvePow("login", user.email);
    const res = await client.fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": FIREFOX_LINUX },
      body: JSON.stringify({ email: user.email, password: PASSWORD, pow }),
    });
    expect(res.status).toBe(200);

    const notifications = await waitForNotifications(user.id, 1);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].body).toContain("Firefox en Linux");
  });

  it("un login desde el MISMO dispositivo no avisa", async () => {
    const user = await createTestUser({ password: PASSWORD });
    await createTestSession(user.id, { userAgent: CHROME_MAC });

    const client = new TestClient();
    const pow = await client.solvePow("login", user.email);
    await client.fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": CHROME_MAC },
      body: JSON.stringify({ email: user.email, password: PASSWORD, pow }),
    });

    await new Promise((resolve) => setTimeout(resolve, 600));
    const notifications = await query("SELECT 1 FROM notifications WHERE user_id = $1;", [user.id]);
    expect(notifications.rows).toHaveLength(0);
  });

  it("5 intentos fallidos contra una cuenta real (desde IPs distintas) avisan UNA vez, sin bloquearla", async () => {
    const user = await createTestUser({ password: PASSWORD });

    for (let i = 0; i < 6; i++) {
      const res = await new TestClient().post("/api/auth/login", { email: user.email, password: "mal" });
      expect(res.status).toBe(401);
    }

    const notifications = await waitForNotifications(user.id, 1);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toContain("Intentos fallidos");

    // La cuenta sigue accesible para su dueño.
    expect((await new TestClient().post("/api/auth/login", { email: user.email, password: PASSWORD })).status).toBe(200);
  }, 60_000);
});
