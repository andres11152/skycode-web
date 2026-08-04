import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, type UserSession } from "./session";

const user: UserSession = { id: 1, name: "Ada Lovelace", email: "ada@skycode.agency", role: "admin" };

describe("session tokens", () => {
  it("round-trips a valid session through sign + verify", async () => {
    const token = await createSessionToken(user);
    const session = await verifySessionToken(token);
    expect(session).toEqual({ id: "1", name: user.name, email: user.email, role: user.role });
  });

  it("rejects a malformed token", async () => {
    const session = await verifySessionToken("not-a-real-token");
    expect(session).toBeNull();
  });

  it("rejects a token whose signature was tampered with", async () => {
    const token = await createSessionToken(user);
    const [header, payload, signature] = token.split(".");
    const flippedSignature = signature.slice(0, -2) + (signature.endsWith("aa") ? "bb" : "aa");
    const tampered = `${header}.${payload}.${flippedSignature}`;

    const session = await verifySessionToken(tampered);
    expect(session).toBeNull();
  });
});
