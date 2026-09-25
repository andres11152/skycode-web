import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// E2E: servidor Next.js real (arrancado por e2e/globalSetup.ts) + HTTP
// real contra la Postgres desechable. Requiere `npm run test:db:up &&
// npm run test:db:migrate` antes de correr.
export default defineConfig({
  resolve: {
    // Mismo alias que vitest.config.mts/vitest.integration.config.mts —
    // ver el comentario ahí para el motivo (importar un valor real, no
    // solo un `import type`, vía "@/" desde un archivo bajo test).
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  test: {
    environment: "node",
    // Mismo .env.test que integración: los propios archivos de test
    // necesitan DATABASE_URL para verificar/limpiar datos directo contra
    // la BD (audit_log, borrado de fixtures), no solo para el server.
    setupFiles: ["./vitest.integration.setup.ts"],
    globalSetup: ["./e2e/globalSetup.ts"],
    include: ["e2e/**/*.e2e.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    // globalSetup ahora corre `next build` antes de levantar el server
    // (ver e2e/globalSetup.ts) — más lento que arrancar `next dev`, pero
    // mucho más estable bajo la carga de la suite completa.
    hookTimeout: 180_000,
  },
});
