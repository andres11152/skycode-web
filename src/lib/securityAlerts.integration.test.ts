import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { query } from "./db";
import { detectNewDevice, notifyFailedLoginBurst, notifyNewDeviceLogin } from "./securityAlerts";
import { authenticateUserCredentials } from "./authService";
import { createTestSession, createTestUser, resetTestDb } from "./testHelpers/db";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";

beforeEach(async () => {
  await resetTestDb();
});

describe("detectNewDevice", () => {
  it("el primer acceso de una cuenta (sin sesiones previas) NO es 'dispositivo nuevo'", async () => {
    const user = await createTestUser();
    expect(await detectNewDevice(user.id, CHROME_MAC)).toBe(false);
  });

  it("el mismo navegador/sistema que ya usó NO es nuevo", async () => {
    const user = await createTestUser();
    await createTestSession(user.id, { userAgent: CHROME_MAC });
    expect(await detectNewDevice(user.id, CHROME_MAC)).toBe(false);
  });

  it("un navegador/sistema distinto SÍ es nuevo", async () => {
    const user = await createTestUser();
    await createTestSession(user.id, { userAgent: CHROME_MAC });
    expect(await detectNewDevice(user.id, FIREFOX_LINUX)).toBe(true);
  });

  it("las sesiones de OTRA persona no cuentan", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await createTestSession(other.id, { userAgent: FIREFOX_LINUX });
    await createTestSession(owner.id, { userAgent: CHROME_MAC });
    expect(await detectNewDevice(owner.id, FIREFOX_LINUX)).toBe(true);
  });
});

describe("avisos al dueño", () => {
  it("notifyNewDeviceLogin crea la campanita y deja rastro en la auditoría", async () => {
    const user = await createTestUser();
    await notifyNewDeviceLogin({ userId: user.id, ip: "203.0.113.7", userAgent: FIREFOX_LINUX });

    const notifications = await query("SELECT type, title, body FROM notifications WHERE user_id = $1;", [user.id]);
    expect(notifications.rows).toHaveLength(1);
    expect(notifications.rows[0].type).toBe("security");
    expect(notifications.rows[0].body).toContain("Firefox en Linux");

    const audit = await query("SELECT action FROM audit_log WHERE action = 'user.new_device_login';");
    expect(audit.rows).toHaveLength(1);
  });

  it("notifyFailedLoginBurst avisa sin bloquear nada", async () => {
    const user = await createTestUser();
    await notifyFailedLoginBurst({ userId: user.id, failures: 5, ip: "203.0.113.7" });

    const notifications = await query("SELECT body FROM notifications WHERE user_id = $1;", [user.id]);
    expect(notifications.rows).toHaveLength(1);
    expect(notifications.rows[0].body).toContain("NO está bloqueada");
  });

  it("no avisa a una cuenta desactivada", async () => {
    const user = await createTestUser({ status: "disabled" });
    await notifyFailedLoginBurst({ userId: user.id, failures: 5, ip: "203.0.113.7" });
    const notifications = await query("SELECT 1 FROM notifications WHERE user_id = $1;", [user.id]);
    expect(notifications.rows).toHaveLength(0);
  });
});

describe("authenticateUserCredentials", () => {
  it("re-hashea de bcrypt a scrypt tras un login correcto, y la contraseña sigue funcionando", async () => {
    const user = await createTestUser({ password: "ContraseñaLarga123456", legacyBcrypt: true });
    const before = await query("SELECT password_hash FROM users WHERE id = $1;", [user.id]);
    expect(before.rows[0].password_hash).toMatch(/^\$2/);

    const first = await authenticateUserCredentials({ email: user.email, password: "ContraseñaLarga123456", ip: "1.2.3.4" });
    expect(first.status).toBe("success");

    const after = await query("SELECT password_hash FROM users WHERE id = $1;", [user.id]);
    expect(after.rows[0].password_hash).toMatch(/^scrypt\$32768\$8\$3\$/);

    const second = await authenticateUserCredentials({ email: user.email, password: "ContraseñaLarga123456", ip: "1.2.3.4" });
    expect(second.status).toBe("success");
  });

  it("una contraseña incorrecta NO re-hashea (el hash legado queda intacto)", async () => {
    const user = await createTestUser({ password: "ContraseñaLarga123456", legacyBcrypt: true });
    const result = await authenticateUserCredentials({ email: user.email, password: "otra-cosa", ip: "1.2.3.4" });
    expect(result).toEqual({ status: "invalid", userId: user.id });

    const row = await query("SELECT password_hash FROM users WHERE id = $1;", [user.id]);
    expect(await bcrypt.compare("ContraseñaLarga123456", row.rows[0].password_hash)).toBe(true);
  });

  it("un correo inexistente devuelve invalid con userId null", async () => {
    const result = await authenticateUserCredentials({ email: "nadie@test.local", password: "x", ip: "1.2.3.4" });
    expect(result).toEqual({ status: "invalid", userId: null });
  });
});
