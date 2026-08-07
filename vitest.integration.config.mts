import { defineConfig } from "vitest/config";

// Integración: prueba lib/queries/* y lib/authSession.ts contra Postgres
// real (el contenedor desechable de docker-compose.test.yml), no contra
// producción. Requiere `npm run test:db:up` antes de correr — ver
// package.json. Corre en serie (fileParallelism: false): todos los tests
// comparten un único pool de conexiones (getPool() en lib/db.ts es un
// singleton de módulo) y las transacciones de rollback por test asumen
// que no hay otra corriendo en paralelo sobre las mismas filas.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.integration.setup.ts"],
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
