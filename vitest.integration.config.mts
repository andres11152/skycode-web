import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Integración: prueba lib/queries/* y lib/authSession.ts contra Postgres
// real (el contenedor desechable de docker-compose.test.yml), no contra
// producción. Requiere `npm run test:db:up` antes de correr — ver
// package.json. Corre en serie (fileParallelism: false): todos los tests
// comparten un único pool de conexiones (getPool() en lib/db.ts es un
// singleton de módulo) y las transacciones de rollback por test asumen
// que no hay otra corriendo en paralelo sobre las mismas filas.
export default defineConfig({
  resolve: {
    // Mismo alias "@/*" -> "./src/*" que vitest.config.mts — sin esto,
    // cualquier módulo bajo test que importe un VALOR en tiempo de
    // ejecución (no solo un `import type`, que TypeScript/esbuild elide
    // por completo antes de resolver el módulo) a través de "@/" revienta
    // con "Cannot find package '@/...'" aunque `tsc`/`next build` lo
    // resuelvan bien. Se quedó sin este alias hasta que
    // lib/queries/portfolio.ts fue el primer módulo bajo test de
    // integración en importar un valor real (no solo tipos) vía "@/"
    // (`resolveLocalizedText` de content/portfolioShared.ts) — bug latente
    // real, no solo teórico.
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.integration.setup.ts"],
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
