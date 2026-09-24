import { describe, expect, it } from "vitest";
import { buildOtpauthUri, generateBackupCodes, generateTotpCode, generateTotpSecret, verifyTotpCode } from "./totp";

// Secreto ASCII "12345678901234567890" del Apéndice B de RFC 6238,
// codificado en base32 (ver el script usado para producirlo en el commit
// que agregó este archivo). La RFC publica códigos de 8 dígitos para este
// secreto en varios timestamps — el código de 6 dígitos que usa este
// proyecto es el mismo cálculo con módulo 10^6 en vez de 10^8, es decir,
// los últimos 6 dígitos del valor de 8 dígitos que publica la RFC.
const RFC_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("generateTotpCode / verifyTotpCode — vectores oficiales de RFC 6238 (Apéndice B, SHA1)", () => {
  const vectors: Array<[number, string]> = [
    [59, "287082"], // RFC: 94287082
    [1111111109, "081804"], // RFC: 07081804
    [1111111111, "050471"], // RFC: 14050471
    [1234567890, "005924"], // RFC: 89005924
    [2000000000, "279037"], // RFC: 69279037
  ];

  it.each(vectors)("T=%i segundos -> código %s", (timeSeconds, expectedCode) => {
    const code = generateTotpCode(RFC_SECRET_BASE32, timeSeconds * 1000);
    expect(code).toBe(expectedCode);
    expect(verifyTotpCode(RFC_SECRET_BASE32, expectedCode, 0, timeSeconds * 1000)).toBe(true);
  });
});

describe("verifyTotpCode — tolerancia de reloj y validación de formato", () => {
  it("acepta el código del paso anterior/siguiente dentro de la ventana (± 30s)", () => {
    // T=59 -> contador 1 (59/30 truncado). Un código generado en T=59
    // debe seguir siendo válido consultado en T=59+30=89 (contador 2, un
    // paso después) gracias a window=1.
    expect(verifyTotpCode(RFC_SECRET_BASE32, "287082", 1, 89 * 1000)).toBe(true);
  });

  it("rechaza un código fuera de la ventana de tolerancia", () => {
    // 3 pasos de diferencia (90s) supera window=1.
    expect(verifyTotpCode(RFC_SECRET_BASE32, "287082", 1, 59_000 + 90_000)).toBe(false);
  });

  it("rechaza códigos con formato inválido sin reventar", () => {
    expect(verifyTotpCode(RFC_SECRET_BASE32, "12345", 1, 59_000)).toBe(false); // 5 dígitos
    expect(verifyTotpCode(RFC_SECRET_BASE32, "abcdef", 1, 59_000)).toBe(false); // no numérico
    expect(verifyTotpCode(RFC_SECRET_BASE32, "", 1, 59_000)).toBe(false);
    expect(verifyTotpCode(RFC_SECRET_BASE32, "1234567", 1, 59_000)).toBe(false); // 7 dígitos
  });

  it("tolera espacios alrededor del código (como los agrupa la app del teléfono)", () => {
    expect(verifyTotpCode(RFC_SECRET_BASE32, " 287082 ", 0, 59_000)).toBe(true);
  });

  it("rechaza el código correcto de OTRO secreto", () => {
    const otherSecret = generateTotpSecret();
    expect(verifyTotpCode(otherSecret, "287082", 1, 59_000)).toBe(false);
  });
});

describe("generateTotpSecret", () => {
  it("genera secretos base32 válidos y distintos en cada llamada", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Z2-7]+$/);
    expect(a.length).toBeGreaterThanOrEqual(32); // 20 bytes -> 32 chars base32
  });

  it("un secreto recién generado produce un código verificable consigo mismo", () => {
    const secret = generateTotpSecret();
    const code = generateTotpCode(secret);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });
});

describe("buildOtpauthUri", () => {
  it("arma una URI otpauth:// válida con el secreto, issuer y parámetros esperados", () => {
    const uri = buildOtpauthUri({ secret: RFC_SECRET_BASE32, accountLabel: "admin@skycode.agency" });
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(`secret=${RFC_SECRET_BASE32}`);
    expect(uri).toContain("issuer=SkyCode.Agency");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
    expect(uri).toContain(encodeURIComponent("SkyCode.Agency:admin@skycode.agency"));
  });
});

describe("generateBackupCodes", () => {
  it("genera 8 códigos únicos con el formato XXXXX-XXXXX", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
    }
  });

  it("acepta una cantidad personalizada", () => {
    expect(generateBackupCodes(3)).toHaveLength(3);
  });
});
