import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const sessionId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("session tokens", () => {
  it("round-trips a session id through sign + verify", async () => {
    const token = await createSessionToken({ sessionId });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sessionId });
  });

  it("rejects a malformed token", async () => {
    const payload = await verifySessionToken("not-a-real-token");
    expect(payload).toBeNull();
  });

  it("rejects a token whose signature was tampered with", async () => {
    const token = await createSessionToken({ sessionId });
    const [header, payload, signature] = token.split(".");
    const flippedSignature = signature.slice(0, -2) + (signature.endsWith("aa") ? "bb" : "aa");
    const tampered = `${header}.${payload}.${flippedSignature}`;

    const result = await verifySessionToken(tampered);
    expect(result).toBeNull();
  });
});
