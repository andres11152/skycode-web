import { afterEach, describe, expect, it, vi } from "vitest";
import { publicOrigin } from "./publicOrigin";

const request = new Request("https://localhost:10000/api/auth/forgot-password");

describe("publicOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("en producción usa el dominio canónico, no el origen interno del proxy", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKYCODE_E2E", "");
    expect(publicOrigin(request)).not.toContain("localhost");
    expect(publicOrigin(request)).toMatch(/^https:\/\//);
  });

  it("en desarrollo conserva el origen de la petición", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(publicOrigin(request)).toBe("https://localhost:10000");
  });

  it("en el servidor E2E conserva el origen de la petición", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKYCODE_E2E", "1");
    expect(publicOrigin(request)).toBe("https://localhost:10000");
  });
});
