import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Unitarias: lógica pura, sin Postgres. Excluye explícitamente
// *.integration.test.ts (ver vitest.integration.config.mts) — así
// `npm test` sigue siendo instantáneo y no falla si no hay Docker
// levantado.
export default defineConfig({
  resolve: {
    // Espeja el alias "@/*" -> "./src/*" de tsconfig.json. Vitest no lo lee
    // solo; sin esto, cualquier archivo bajo test que importe algo con "@/"
    // (directo o transitivo, ej. leadConfirmationEmail.ts -> lib/site.ts ->
    // content/locales/*.json) revienta con "Cannot find package '@/...'"
    // aunque `tsc`/`next build` lo resuelvan bien.
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
  },
});
