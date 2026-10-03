#!/usr/bin/env node
// Uso (contra un servidor LOCAL de pruebas, nunca producción):
//   npm run test:db:up && npm run test:db:migrate
//   (set -a; source .env.test; set +a; unset AUTH_POW_MIN_AGE_MS AUTH_MIN_DURATION_MS; \
//     SKYCODE_E2E=1 npx next build && SKYCODE_E2E=1 npx next start -p 4199)
//   node scripts/auth-attack-sim.mjs http://localhost:4199
//
// Simula, contra las superficies de autenticación, lo que haría un atacante
// real y mide si la defensa aguanta:
//   1. Inundación de logins sin proof-of-work.
//   2. Inundación con proof-of-work basura.
//   3. Payloads de inyección (SQL, NoSQL, NUL, unicode, tamaños extremos).
//   4. Cuerpos enormes, JSON roto, tipos y métodos equivocados.
//   5. Replay: el MISMO proof-of-work válido enviado en paralelo.
// Mientras tanto una sonda mide la latencia de /api/auth/challenge (que toca
// la base) para comprobar que el servidor sigue respondiendo bajo ataque.
//
// Pasa si: NINGUNA respuesta es 5xx, el replay deja pasar exactamente 1, y la
// latencia p95 de la sonda no se dispara. Sale con código 1 si algo falla.
//
// SEGURIDAD: por defecto se niega a apuntar a un host que no sea local — esto
// es una herramienta de prueba de carga para el propio entorno de desarrollo.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = new URL(process.argv[2] ?? "http://localhost:4199");
const allowRemote = process.argv.includes("--i-own-this-target");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (!LOCAL_HOSTS.has(target.hostname) && !allowRemote) {
  console.error(
    `Se niega a atacar ${target.hostname}: no es un host local.\n` +
      "Esta herramienta es para probar TU entorno de desarrollo. Si de verdad es un\n" +
      "entorno tuyo y aislado, agrega --i-own-this-target.",
  );
  process.exit(2);
}

const BASE = target.origin;
const WORKER_SOURCE = readFileSync(join(__dirname, "..", "public", "pow-worker.js"), "utf-8");

function solvePow(challenge) {
  const payload = JSON.parse(Buffer.from(challenge.split(".")[0], "base64url").toString("utf-8"));
  const worker = {};
  let solution = "";
  worker.postMessage = (message) => {
    solution = message.solution ?? "";
  };
  new Function("self", WORKER_SOURCE)(worker);
  worker.onmessage({ data: { salt: payload.salt, bits: payload.bits } });
  return solution;
}

let ipCounter = 0;
/** IP simulada distinta por petición (el servidor de pruebas confía en el extremo derecho de X-Forwarded-For). */
function nextIp() {
  ipCounter++;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

async function call(path, { method = "POST", body, headers = {}, ip = nextIp(), raw = false } = {}) {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "x-forwarded-for": ip,
        Origin: BASE,
        "Sec-Fetch-Site": "same-origin",
        ...(method === "POST" && !headers["Content-Type"] ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: method === "GET" || method === "HEAD" ? undefined : raw ? body : body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await res.text();
    return { status: res.status, ms: performance.now() - started, text };
  } catch (error) {
    return { status: 0, ms: performance.now() - started, text: String(error) };
  }
}

async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

function histogram(results) {
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const failures = [];
function check(condition, message) {
  console.log(`  ${condition ? "✔" : "✘"} ${message}`);
  if (!condition) failures.push(message);
}

// ── Sonda de salud: pide un reto (toca la base) cada 150 ms durante todo el ataque ──
const probeLatencies = [];
let probing = true;
async function probeLoop() {
  while (probing) {
    const r = await call("/api/auth/challenge", { body: { surface: "login", identifier: "sonda@test.local" } });
    if (r.status === 200) probeLatencies.push(r.ms);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

console.log(`\nObjetivo: ${BASE}\n`);

// Línea base antes de atacar.
const baseline = [];
for (let i = 0; i < 10; i++) {
  const r = await call("/api/auth/challenge", { body: { surface: "login", identifier: "base@test.local" } });
  if (r.status === 200) baseline.push(r.ms);
}
if (baseline.length === 0) {
  console.error("El servidor no respondió a la línea base. ¿Está levantado y con la base de pruebas?");
  process.exit(2);
}
const baselineP95 = percentile(baseline, 95);
console.log(`Línea base (reto): p50 ${percentile(baseline, 50).toFixed(0)} ms · p95 ${baselineP95.toFixed(0)} ms\n`);

const probe = probeLoop();
const all5xx = [];
const track = (results) => {
  for (const r of results) if (r.status >= 500 || r.status === 0) all5xx.push(r);
  return results;
};

// 1. Inundación sin proof-of-work -------------------------------------------------
console.log("1) 400 logins sin proof-of-work, desde IPs distintas");
const wave1 = track(await inBatches(Array.from({ length: 400 }), 80, () => call("/api/auth/login", { body: { email: "victima@test.local", password: "x" } })));
console.log("   estados:", JSON.stringify(histogram(wave1)));
check(wave1.every((r) => r.status === 403), "todos rechazados con 403 pow_required (sin verificar ninguna contraseña)");

// 2. Misma IP, ráfaga: el token bucket debe descartar ------------------------------
console.log("2) 200 peticiones desde UNA sola IP (ráfaga)");
const burstIp = "10.250.250.250";
const wave2 = track(await inBatches(Array.from({ length: 200 }), 100, () => call("/api/auth/login", { ip: burstIp, body: { email: "victima@test.local", password: "x" } })));
console.log("   estados:", JSON.stringify(histogram(wave2)));
check(wave2.filter((r) => r.status === 429).length >= 100, "la mayoría se descarta con 429 antes de llegar al handler (load-shedding)");

// 3. Proof-of-work basura -----------------------------------------------------------
console.log("3) 200 logins con proof-of-work falso / alterado");
const wave3 = track(
  await inBatches(Array.from({ length: 200 }), 80, (_, i) =>
    call("/api/auth/login", {
      body: { email: "victima@test.local", password: "x", pow: { challenge: `basura${i}.firma`, solution: String(i) } },
    }),
  ),
);
console.log("   estados:", JSON.stringify(histogram(wave3)));
check(wave3.every((r) => r.status === 403), "todos rechazados con 403 (la firma no valida)");

// 4. Payloads hostiles con PoW VÁLIDO (llegan hasta la lógica de login) --------------
console.log("4) payloads de inyección con proof-of-work válido");
const PAYLOADS = [
  "' OR '1'='1", "admin'--", "'; DROP TABLE users;--", '" OR ""="', "1; SELECT pg_sleep(5)--",
  '{"$ne":null}', "a@b.com\u0000", "\u0000", "ａｄｍｉｎ＠ｔｅｓｔ.com", "A".repeat(300),
  "<script>alert(1)</script>@x.com", "%00%27%20OR%201=1", "\ud800", "𝕒𝕕𝕞𝕚𝕟@test.com", "../../etc/passwd",
];
const wave4 = [];
for (const payload of PAYLOADS) {
  for (const field of ["email", "password"]) {
    const ip = nextIp();
    const ch = await call("/api/auth/challenge", { ip, body: { surface: "login", identifier: field === "email" ? payload.slice(0, 254) : "nadie@test.local" } });
    if (ch.status !== 200) {
      wave4.push(ch);
      continue;
    }
    const issued = JSON.parse(ch.text);
    await new Promise((resolve) => setTimeout(resolve, issued.minAgeMs + 30));
    const pow = { challenge: issued.challenge, solution: solvePow(issued.challenge) };
    wave4.push(await call("/api/auth/login", { ip, body: field === "email" ? { email: payload, password: "x", pow } : { email: "nadie@test.local", password: payload, pow } }));
  }
}
track(wave4);
console.log("   estados:", JSON.stringify(histogram(wave4)));
check(wave4.every((r) => [400, 401, 403, 429].includes(r.status)), "ningún payload provoca un 5xx (todos 400/401/403/429)");

// 5. Forma de la petición -----------------------------------------------------------
console.log("5) cuerpos enormes, JSON roto, tipos y métodos equivocados");
const huge = "x".repeat(2_000_000);
const wave5 = track([
  ...(await Promise.all(Array.from({ length: 15 }, () => call("/api/auth/login", { raw: true, body: JSON.stringify({ email: "a@b.com", password: huge }) })))),
  ...(await Promise.all(Array.from({ length: 15 }, () => call("/api/auth/login", { raw: true, body: "{no es json" })))),
  ...(await Promise.all(Array.from({ length: 15 }, () => call("/api/auth/login", { raw: true, body: "a=1", headers: { "Content-Type": "application/x-www-form-urlencoded" } })))),
  ...(await Promise.all(Array.from({ length: 15 }, () => call("/api/auth/login", { raw: true, body: "[]" })))),
  ...(await Promise.all(["GET", "PUT", "DELETE", "PATCH"].map((method) => call("/api/auth/login", { method })))),
]);
console.log("   estados:", JSON.stringify(histogram(wave5)));
check(wave5.every((r) => r.status < 500 && r.status !== 0), "ninguna forma anómala provoca un 5xx ni tumba la conexión");
check(wave5.slice(0, 15).every((r) => r.status === 413), "los cuerpos de 2 MB se cortan con 413");

// 6. Replay ---------------------------------------------------------------------------
console.log("6) replay: el MISMO proof-of-work válido enviado 20 veces en paralelo");
{
  const ip = nextIp();
  const ch = await call("/api/auth/challenge", { ip, body: { surface: "login", identifier: "replay@test.local" } });
  const issued = JSON.parse(ch.text);
  await new Promise((resolve) => setTimeout(resolve, issued.minAgeMs + 30));
  const pow = { challenge: issued.challenge, solution: solvePow(issued.challenge) };
  const wave6 = track(await Promise.all(Array.from({ length: 20 }, () => call("/api/auth/login", { ip: nextIp(), body: { email: "replay@test.local", password: "x", pow } }))));
  console.log("   estados:", JSON.stringify(histogram(wave6)));
  check(wave6.filter((r) => r.status === 401).length === 1, "exactamente UNA petición llegó a verificar credenciales (401); las otras 19 → 403");
}

probing = false;
await probe;

// ── Resultado ──────────────────────────────────────────────────────────────────────
console.log("\nSonda de salud durante el ataque (reto, toca la base):");
const p50 = percentile(probeLatencies, 50);
const p95 = percentile(probeLatencies, 95);
const max = Math.max(...probeLatencies, 0);
console.log(`  ${probeLatencies.length} muestras · p50 ${p50.toFixed(0)} ms · p95 ${p95.toFixed(0)} ms · máx ${max.toFixed(0)} ms (línea base p95 ${baselineP95.toFixed(0)} ms)`);
check(probeLatencies.length >= 5, "la sonda siguió obteniendo respuestas 200 durante todo el ataque");
check(p95 < Math.max(1500, baselineP95 * 10), "el p95 de la sonda no se disparó (el servidor sigue respondiendo)");
check(all5xx.length === 0, `cero respuestas 5xx o conexiones caídas en todo el ataque (${all5xx.length})`);

if (all5xx.length > 0) {
  console.log("\nPrimeras respuestas 5xx:");
  for (const r of all5xx.slice(0, 3)) console.log(`  ${r.status}: ${r.text.slice(0, 160)}`);
}

console.log(failures.length === 0 ? "\n✅ La defensa aguantó.\n" : `\n❌ ${failures.length} comprobación(es) fallaron.\n`);
process.exit(failures.length === 0 ? 0 : 1);
