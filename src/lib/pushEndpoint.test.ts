import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "./pushEndpoint";

describe("isAllowedPushEndpoint", () => {
  it("acepta los servicios push de los navegadores", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
  });
  it("rechaza hosts internos, http, puertos y dominios que solo lo contienen", () => {
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.tld/x")).toBe(false);
    expect(isAllowedPushEndpoint("no-es-url")).toBe(false);
  });
});
