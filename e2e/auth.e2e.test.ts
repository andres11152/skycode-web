import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("POST /api/auth/login", () => {
  it("credenciales válidas: 200, setea la cookie httpOnly y devuelve el usuario", async () => {
    const user = await createTestUser({ name: "Ana", role: "admin", password: "SuperSecret123456" });
    const client = new TestClient();

    const res = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toMatchObject({ id: user.id, email: user.email, role: "admin" });
    expect(client.hasCookie("skycode_session")).toBe(true);
  });

  it("contraseña incorrecta: 401, sin setear cookie", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const client = new TestClient();

    const res = await client.post("/api/auth/login", { email: user.email, password: "contraseña-equivocada" });
    expect(res.status).toBe(401);
    expect(client.hasCookie("skycode_session")).toBe(false);
  });

  it("email que no existe: 401 (mismo mensaje que contraseña incorrecta, no filtra qué correos existen)", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/login", {
      email: "no-existe@test.local",
      password: "cualquier-cosa",
    });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Credenciales de acceso no válidas.");
  });

  it("usuario desactivado: 401 aunque la contraseña sea correcta", async () => {
    const user = await createTestUser({ status: "disabled", password: "SuperSecret123456" });
    const client = new TestClient();

    const res = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    expect(res.status).toBe(401);
  });

  it("body inválido (sin password): 400", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/login", { email: "algo@test.local" });
    expect(res.status).toBe(400);
  });

  it("email malformado: 400", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/login", { email: "no-es-un-email", password: "algosuficientemente-largo" });
    expect(res.status).toBe(400);
  });

  it("bloquea después de 5 intentos fallidos desde la misma IP con 429", async () => {
    await createTestUser({ email: "victima@test.local", password: "SuperSecret123456" });
    const client = new TestClient("10.9.9.9"); // IP fija y exclusiva de este test

    for (let i = 0; i < 5; i++) {
      const res = await client.post("/api/auth/login", { email: "victima@test.local", password: "mal" });
      expect(res.status).toBe(401);
    }

    const blocked = await client.post("/api/auth/login", { email: "victima@test.local", password: "mal" });
    expect(blocked.status).toBe(429);

    // Ni siquiera con la contraseña correcta pasa mientras dure el bloqueo.
    const evenWithGoodPassword = await client.post("/api/auth/login", {
      email: "victima@test.local",
      password: "SuperSecret123456",
    });
    expect(evenWithGoodPassword.status).toBe(429);
  });

  it("no revela por timing si el email existe o no (oráculo de timing)", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });

    const timeIt = async (email: string) => {
      const client = new TestClient();
      const start = performance.now();
      await client.post("/api/auth/login", { email, password: "contraseña-equivocada" });
      return performance.now() - start;
    };

    function median(values: number[]): number {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    // Calienta la ruta: en `next dev` la primera vez que se golpea un
    // endpoint paga el costo de compilación JIT, que domina por completo
    // cualquier diferencia de timing real y no tiene nada que ver con la
    // propiedad de seguridad que se está verificando.
    await timeIt(user.email);
    await timeIt("calentamiento@test.local");

    // Plan B: mide varias corridas de cada rama y compara la MEDIANA (no el
    // promedio, sensible a un outlier por GC/jitter del proceso) — es una
    // verificación best-effort, no una medición de laboratorio.
    const runs = 8;
    const existingTimes: number[] = [];
    const missingTimes: number[] = [];
    for (let i = 0; i < runs; i++) {
      existingTimes.push(await timeIt(user.email));
      missingTimes.push(await timeIt("no-existe-para-nada@test.local"));
    }
    const medExisting = median(existingTimes);
    const medMissing = median(missingTimes);

    // Ambas ramas pasan por bcrypt.compare() contra un hash real (uno de
    // usuario, otro dummy) — la tolerancia es amplia a propósito (ruido de
    // proceso compartido: se vio un ratio de ~20 corriendo dentro de la
    // suite completa, contra ~2-3 en aislamiento), pero un oráculo real
    // (alguien quitando el hash dummy) dejaría la rama "no existe"
    // retornando casi instantáneo sin pasar por bcrypt — un salto de uno o
    // dos órdenes de magnitud (100x+), no de unas pocas decenas de veces.
    const ratio = Math.max(medExisting, medMissing) / Math.max(1, Math.min(medExisting, medMissing));
    expect(ratio).toBeLessThan(40);
  });
});

describe("GET /api/auth/me", () => {
  it("sin cookie: 401", async () => {
    const client = new TestClient();
    const res = await client.get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("con sesión válida: 200 y los datos actuales del usuario", async () => {
    const user = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const client = await loginAs(user.email, "SuperSecret123456");

    const res = await client.get("/api/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user).toMatchObject({ id: user.id, email: user.email, role: "sales_manager" });
  });

  it("cookie manipulada/corrupta: 401, no 500", async () => {
    const client = new TestClient();
    client.setRawCookie("skycode_session", "esto-no-es-un-jwt-valido");

    const res = await client.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout — revocación inmediata", () => {
  it("después de logout, la misma cookie ya no autentica (revocación en BD, no solo se borra la cookie del cliente)", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const client = await loginAs(user.email, "SuperSecret123456");

    const before = await client.get("/api/auth/me");
    expect(before.status).toBe(200);

    const logoutRes = await client.post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);

    const after = await client.get("/api/auth/me");
    expect(after.status).toBe(401);
  });

  it("un logout sin sesión activa igual responde 200 (idempotente)", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/logout");
    expect(res.status).toBe(200);
  });
});
