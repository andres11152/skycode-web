import { defineConfig } from "vitest/config";

// Unitarias: lógica pura, sin Postgres. Excluye explícitamente
// *.integration.test.ts (ver vitest.integration.config.mts) — así
// `npm test` sigue siendo instantáneo y no falla si no hay Docker
// levantado.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
  },
});
