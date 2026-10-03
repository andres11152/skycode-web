import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { DUMMY_SCRYPT_HASH, hashPassword, needsRehash, verifyPassword } from "./passwordHash";

describe("passwordHash", () => {
  it("hashea con scrypt y verifica la contraseña correcta", async () => {
    const hash = await hashPassword("una-contraseña-larga-123");
    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(await verifyPassword("una-contraseña-larga-123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("correcta");
    expect(await verifyPassword("incorrecta", hash)).toBe(false);
  });

  it("dos hashes de la misma contraseña usan sal distinta", async () => {
    expect(await hashPassword("misma")).not.toBe(await hashPassword("misma"));
  });

  it("sigue verificando los hashes bcrypt heredados", async () => {
    const legacy = await bcrypt.hash("heredada", 10);
    expect(await verifyPassword("heredada", legacy)).toBe(true);
    expect(await verifyPassword("otra", legacy)).toBe(false);
  });

  it("un hash con formato irreconocible devuelve false sin lanzar", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "texto-plano")).toBe(false);
    expect(await verifyPassword("x", "scrypt$basura")).toBe(false);
    expect(await verifyPassword("x", "scrypt$99999999999$8$3$AAAA$AAAA")).toBe(false);
  });

  it("needsRehash: bcrypt y parámetros débiles sí, scrypt vigente no", async () => {
    expect(needsRehash(await bcrypt.hash("x", 10))).toBe(true);
    expect(needsRehash("scrypt$16384$8$1$QUJD$QUJD")).toBe(true);
    expect(needsRehash(await hashPassword("x"))).toBe(false);
  });

  it("el hash señuelo es scrypt bien formado con los parámetros vigentes (ejecuta el trabajo completo)", async () => {
    expect(needsRehash(DUMMY_SCRYPT_HASH)).toBe(false);
    const started = Date.now();
    expect(await verifyPassword("cualquier-cosa", DUMMY_SCRYPT_HASH)).toBe(false);
    // Un hash malformado se rechazaría en <1 ms; el trabajo real toma decenas de ms.
    expect(Date.now() - started).toBeGreaterThan(20);
  });
});
