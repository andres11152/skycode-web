import { describe, expect, it } from "vitest";
import { shouldRethrowDbError } from "./dbBuildGuard";

describe("shouldRethrowDbError", () => {
  it("relanza solo en producción en ejecución", () => {
    expect(shouldRethrowDbError({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server" })).toBe(true);
    expect(shouldRethrowDbError({ NODE_ENV: "production" })).toBe(true);
  });
  it("se silencia durante next build solo si no hay base configurada (CI)", () => {
    expect(shouldRethrowDbError({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toBe(false);
  });
  it("relanza durante next build si hay DATABASE_URL (evita publicar 404)", () => {
    expect(
      shouldRethrowDbError({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", DATABASE_URL: "postgres://x" })
    ).toBe(true);
  });
  it("se silencia en desarrollo y tests", () => {
    expect(shouldRethrowDbError({ NODE_ENV: "development" })).toBe(false);
    expect(shouldRethrowDbError({ NODE_ENV: "test" })).toBe(false);
  });
});
