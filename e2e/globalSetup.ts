import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { E2E_PORT, BASE_URL } from "./helpers/config";

// Vitest corre `globalSetup` en un proceso aparte del que ejecuta los
// archivos de test (por diseño, para no filtrar estado entre ambos) — por
// eso el server que arrancamos acá necesita su propio `env`, y los
// archivos de test (que sí necesitan DATABASE_URL para limpiar datos
// directo contra la BD) la cargan de nuevo vía vitest.integration.setup.ts
// como setupFiles.
let serverProcess: ChildProcess | null = null;

async function waitForServer(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status < 500) return;
    } catch {
      // el server todavía no acepta conexiones — reintenta
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`El servidor E2E no respondió en localhost:${E2E_PORT} tras ${timeoutMs}ms.`);
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} salió con código ${code}`));
    });
  });
}

export async function setup() {
  const rootDir = path.join(import.meta.dirname, "..");
  process.loadEnvFile(path.join(rootDir, ".env.test"));
  const env = { ...process.env, SKYCODE_E2E: "1" };

  // `next dev` (Turbopack) se vuelve inestable bajo la carga sostenida de
  // la suite completa (cientos de requests entre los 6 archivos E2E) — se
  // vio colgar peticiones individuales por 30s+ solo cuando corrían todos
  // los archivos juntos (nunca uno por uno). `next build` + `next start`
  // corre contra el server real de producción, sin recompilación JIT por
  // ruta, mucho más estable — el mismo consejo que ya sigue la sección de
  // Rendimiento de CLAUDE.md para medir Lighthouse contra un build real.
  await run("npx", ["next", "build"], rootDir, env);

  serverProcess = spawn("npx", ["next", "start", "-p", String(E2E_PORT)], {
    cwd: rootDir,
    env,
    stdio: "pipe",
  });

  serverProcess.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    if (/error/i.test(text)) console.error("[e2e next start]", text.trim());
  });

  await waitForServer(60_000);
}

export async function teardown() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
