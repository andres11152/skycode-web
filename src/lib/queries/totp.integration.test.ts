import { beforeEach, describe, expect, it } from "vitest";
import { confirmTotpSetup, disableTotp, getTotpStatus, regenerateBackupCodes, startTotpSetup, verifyTotpOrBackupCode } from "./totp";
import { generateTotpCode } from "../totp";
import { query } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getTotpStatus", () => {
  it("enabled=false y remainingBackupCodes=0 para un usuario sin 2FA configurado", async () => {
    const user = await createTestUser();
    const status = await getTotpStatus(user.id);
    expect(status).toEqual({ enabled: false, remainingBackupCodes: 0 });
  });

  it("enabled=false para un id que no existe, sin reventar", async () => {
    expect(await getTotpStatus(999999)).toEqual({ enabled: false, remainingBackupCodes: 0 });
  });
});

describe("startTotpSetup + confirmTotpSetup", () => {
  it("no activa 2FA hasta que se confirma con un código real", async () => {
    const user = await createTestUser();
    await startTotpSetup(user.id);

    const status = await getTotpStatus(user.id);
    expect(status.enabled).toBe(false);
  });

  it("confirmar con el código correcto activa 2FA y entrega 8 códigos de respaldo", async () => {
    const user = await createTestUser();
    const { secret } = await startTotpSetup(user.id);
    const code = generateTotpCode(secret);

    const result = await confirmTotpSetup(user.id, code);

    expect(result.success).toBe(true);
    expect(result.backupCodes).toHaveLength(8);

    const status = await getTotpStatus(user.id);
    expect(status.enabled).toBe(true);
    expect(status.remainingBackupCodes).toBe(8);
  });

  it("rechaza confirmar con un código incorrecto, sin activar 2FA", async () => {
    const user = await createTestUser();
    await startTotpSetup(user.id);

    const result = await confirmTotpSetup(user.id, "000000");
    expect(result.success).toBe(false);
    expect(result.backupCodes).toBeUndefined();

    const status = await getTotpStatus(user.id);
    expect(status.enabled).toBe(false);
  });

  it("volver a iniciar la configuración reemplaza el secreto pendiente anterior", async () => {
    const user = await createTestUser();
    const first = await startTotpSetup(user.id);
    const second = await startTotpSetup(user.id);

    expect(second.secret).not.toBe(first.secret);
    // El código del secreto viejo ya no calza contra lo guardado.
    const oldCode = generateTotpCode(first.secret);
    const result = await confirmTotpSetup(user.id, oldCode);
    expect(result.success).toBe(false);
  });
});

describe("verifyTotpOrBackupCode", () => {
  async function setUp2fa() {
    const user = await createTestUser();
    const { secret } = await startTotpSetup(user.id);
    const { backupCodes } = await confirmTotpSetup(user.id, generateTotpCode(secret));
    return { user, secret, backupCodes: backupCodes! };
  }

  it("acepta un código TOTP válido", async () => {
    const { user, secret } = await setUp2fa();
    expect(await verifyTotpOrBackupCode(user.id, generateTotpCode(secret))).toBe(true);
  });

  it("acepta un código de respaldo válido y lo CONSUME (no sirve una segunda vez)", async () => {
    const { user, backupCodes } = await setUp2fa();
    const codeToUse = backupCodes[0];

    expect(await verifyTotpOrBackupCode(user.id, codeToUse)).toBe(true);
    expect(await verifyTotpOrBackupCode(user.id, codeToUse)).toBe(false);

    const status = await getTotpStatus(user.id);
    expect(status.remainingBackupCodes).toBe(7);
  });

  it("rechaza un código inválido", async () => {
    const { user } = await setUp2fa();
    expect(await verifyTotpOrBackupCode(user.id, "000000")).toBe(false);
  });

  it("rechaza cualquier código para un usuario sin 2FA activo", async () => {
    const user = await createTestUser();
    expect(await verifyTotpOrBackupCode(user.id, "123456")).toBe(false);
  });
});

describe("disableTotp", () => {
  it("desactiva 2FA y borra el secreto y los códigos de respaldo con un código válido", async () => {
    const user = await createTestUser();
    const { secret } = await startTotpSetup(user.id);
    await confirmTotpSetup(user.id, generateTotpCode(secret));

    const disabled = await disableTotp(user.id, generateTotpCode(secret));
    expect(disabled).toBe(true);

    const status = await getTotpStatus(user.id);
    expect(status).toEqual({ enabled: false, remainingBackupCodes: 0 });

    const row = await query("SELECT totp_secret, totp_backup_codes FROM users WHERE id = $1;", [user.id]);
    expect(row.rows[0].totp_secret).toBeNull();
    expect(row.rows[0].totp_backup_codes).toBeNull();
  });

  it("no desactiva nada si el código es incorrecto", async () => {
    const user = await createTestUser();
    const { secret } = await startTotpSetup(user.id);
    await confirmTotpSetup(user.id, generateTotpCode(secret));

    expect(await disableTotp(user.id, "000000")).toBe(false);
    expect((await getTotpStatus(user.id)).enabled).toBe(true);
  });
});

describe("regenerateBackupCodes", () => {
  it("los códigos viejos dejan de servir después de regenerar", async () => {
    const user = await createTestUser();
    const { secret } = await startTotpSetup(user.id);
    const { backupCodes: oldCodes } = await confirmTotpSetup(user.id, generateTotpCode(secret));

    const newCodes = await regenerateBackupCodes(user.id, generateTotpCode(secret));
    expect(newCodes).toHaveLength(8);
    expect(newCodes).not.toEqual(oldCodes);

    expect(await verifyTotpOrBackupCode(user.id, oldCodes![0])).toBe(false);
    expect(await verifyTotpOrBackupCode(user.id, newCodes![0])).toBe(true);
  });

  it("null si el código de autorización es incorrecto", async () => {
    const user = await createTestUser();
    const { secret } = await startTotpSetup(user.id);
    await confirmTotpSetup(user.id, generateTotpCode(secret));

    expect(await regenerateBackupCodes(user.id, "000000")).toBeNull();
  });
});
