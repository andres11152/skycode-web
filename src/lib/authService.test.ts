import { describe, expect, it } from "vitest";
import { DUMMY_HASH } from "./authService";
import { needsRehash, verifyPassword } from "./passwordHash";

// DUMMY_HASH defiende contra un timing attack de enumeración de usuarios
// (ver `authenticateUserCredentials`): cuando el correo no existe, el código
// igual verifica la contraseña contra este hash para gastar el MISMO tiempo
// que gastaría verificando una cuenta real. Si fuera un hash malformado, la
// verificación fallaría en microsegundos y un correo inexistente respondería
// visiblemente más rápido que uno real.
describe("DUMMY_HASH", () => {
  it("es un hash scrypt bien formado con los parámetros vigentes", () => {
    expect(DUMMY_HASH).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(needsRehash(DUMMY_HASH)).toBe(false);
  });

  it("toma el trabajo completo de scrypt para comparar, no un atajo por formato inválido", async () => {
    const started = Date.now();
    expect(await verifyPassword("any-password", DUMMY_HASH)).toBe(false);
    expect(Date.now() - started).toBeGreaterThan(20);
  });
});
