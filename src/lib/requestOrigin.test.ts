import { describe, expect, it } from "vitest";
import { isSameOriginAuthRequest, originMatchesHost } from "./requestOrigin";

const h = (init: Record<string, string>) => new Headers(init);

describe("originMatchesHost", () => {
  it("coincide por host ignorando el esquema (TLS terminado en el proxy)", () => {
    expect(originMatchesHost(h({ origin: "https://skycode.agency", host: "skycode.agency" }))).toBe(true);
  });
  it("x-forwarded-host tiene prioridad sobre host", () => {
    expect(originMatchesHost(h({ origin: "https://skycode.agency", host: "srv-interno:10000", "x-forwarded-host": "skycode.agency" }))).toBe(true);
  });
  it("rechaza un origen distinto", () => {
    expect(originMatchesHost(h({ origin: "https://evil.example", host: "skycode.agency" }))).toBe(false);
  });
  it("rechaza un Origin malformado sin lanzar", () => {
    expect(originMatchesHost(h({ origin: "no-es-url", host: "skycode.agency" }))).toBe(false);
  });
});

describe("isSameOriginAuthRequest", () => {
  it("acepta Origin propio", () => {
    expect(isSameOriginAuthRequest(h({ origin: "https://skycode.agency", host: "skycode.agency" }))).toBe(true);
  });
  it("acepta Sec-Fetch-Site same-origin cuando no hay Origin", () => {
    expect(isSameOriginAuthRequest(h({ "sec-fetch-site": "same-origin", host: "skycode.agency" }))).toBe(true);
  });
  it("rechaza Origin ajeno aunque Sec-Fetch-Site diga same-origin", () => {
    expect(isSameOriginAuthRequest(h({ origin: "https://evil.example", "sec-fetch-site": "same-origin", host: "skycode.agency" }))).toBe(false);
  });
  it("rechaza una petición sin ninguna señal (script suelto, curl)", () => {
    expect(isSameOriginAuthRequest(h({ host: "skycode.agency" }))).toBe(false);
  });
  it("rechaza cross-site", () => {
    expect(isSameOriginAuthRequest(h({ "sec-fetch-site": "cross-site", host: "skycode.agency" }))).toBe(false);
  });
});
