import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPasswordPwned } from "./pwnedPasswords";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PREFIX = "5BAA6";
const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

function mockFetch(body: string, ok = true) {
  const fn = vi.fn().mockResolvedValue({ ok, text: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  delete process.env.DISABLE_PWNED_CHECK;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isPasswordPwned", () => {
  it("true cuando el sufijo aparece con conteo > 0", async () => {
    mockFetch(`0018A45C4D1DEF81644B54AB7F969B88D65:1\n${SUFFIX}:10434004\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:2`);
    expect(await isPasswordPwned("password")).toBe(true);
  });

  it("false cuando el sufijo no está en la lista", async () => {
    mockFetch("0018A45C4D1DEF81644B54AB7F969B88D65:1\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:2");
    expect(await isPasswordPwned("password")).toBe(false);
  });

  it("ignora las entradas de relleno (Add-Padding trae conteo 0)", async () => {
    mockFetch(`${SUFFIX}:0`);
    expect(await isPasswordPwned("password")).toBe(false);
  });

  it("solo envía el prefijo de 5 caracteres, nunca la contraseña ni el hash completo (k-anonimato)", async () => {
    const fn = mockFetch("");
    await isPasswordPwned("password");
    const [url, options] = fn.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    expect(url).not.toContain(SUFFIX);
    // La ruta es solo el prefijo; la contraseña en claro jamás viaja (ojo: el
    // dominio "pwnedpasswords.com" contiene la palabra, por eso se mira la ruta).
    expect(new URL(url).pathname).toBe(`/range/${PREFIX}`);
    expect(options.headers["Add-Padding"]).toBe("true");
  });

  it("falla ABIERTO si el servicio responde con error", async () => {
    mockFetch("", false);
    expect(await isPasswordPwned("password")).toBe(false);
  });

  it("falla ABIERTO si la red falla o hay timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await isPasswordPwned("password")).toBe(false);
  });

  it("DISABLE_PWNED_CHECK=true no hace ninguna petición", async () => {
    process.env.DISABLE_PWNED_CHECK = "true";
    const fn = mockFetch(`${SUFFIX}:99`);
    expect(await isPasswordPwned("password")).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });
});
