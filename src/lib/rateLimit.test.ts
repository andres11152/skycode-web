import { describe, expect, it } from "vitest";
import { getClientIp, isRateLimited } from "./rateLimit";

describe("isRateLimited", () => {
  it("allows requests under the limit and blocks once it's reached", () => {
    const key = "test:under-limit";
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
  });

  it("tracks separate buckets per key", () => {
    isRateLimited("test:bucket-a", 1, 60_000);
    expect(isRateLimited("test:bucket-b", 1, 60_000)).toBe(false);
  });
});

describe("getClientIp", () => {
  // TRUSTED_PROXY_HOPS default es 1: el edge del hosting (Vercel/Render) es
  // el único proxy de confianza, así que la IP real es la última entrada de
  // X-Forwarded-For (la que ese proxy observó directamente), no la primera.
  it("trusts the rightmost X-Forwarded-For entry, not the client-supplied leftmost one", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "9.9.9.9, 203.0.113.5" },
    });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("cannot be spoofed by an attacker rotating a fake leftmost IP", () => {
    const forged1 = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.5" },
    });
    const forged2 = new Request("https://example.com", {
      headers: { "x-forwarded-for": "2.2.2.2, 203.0.113.5" },
    });
    // Antes del fix, cada IP falsa a la izquierda generaba una clave de
    // rate-limit distinta y evadía el límite por completo.
    expect(getClientIp(forged1)).toBe(getClientIp(forged2));
  });

  it("falls back to x-real-ip when there is no X-Forwarded-For", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "203.0.113.9" },
    });
    expect(getClientIp(request)).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when no IP header is present", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});
