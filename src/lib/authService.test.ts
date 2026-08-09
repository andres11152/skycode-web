import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { DUMMY_HASH } from "./authService";

// DUMMY_HASH defiende contra un timing attack de enumeración de usuarios
// (ver comentario en authService.ts): si algún día se reemplaza por un valor
// que no sea un hash bcrypt real, bcrypt.compare() vuelve a fallar por
// formato en <1ms en vez de correr el work factor completo, y la diferencia
// de tiempo entre "correo existe" y "correo no existe" vuelve a ser medible.
describe("DUMMY_HASH", () => {
  it("is a well-formed bcrypt hash (60 chars, cost 10)", () => {
    expect(DUMMY_HASH).toHaveLength(60);
    expect(DUMMY_HASH).toMatch(/^\$2[aby]\$10\$[A-Za-z0-9./]{53}$/);
  });

  it("takes the full bcrypt work factor to compare against, not a format-reject shortcut", async () => {
    const start = performance.now();
    await bcrypt.compare("any-password", DUMMY_HASH);
    const elapsedMs = performance.now() - start;

    // Un hash malformado se rechaza en <1ms; uno real cuesta decenas de ms.
    // Umbral bajo a propósito para no volver el test flaky en CI lento.
    expect(elapsedMs).toBeGreaterThan(5);
  });
});
