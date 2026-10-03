import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  POW_MAX_BITS,
  POW_MIN_AGE_MS,
  POW_MIN_BITS,
  POW_TTL_MS,
  issueChallenge,
  leadingZeroBits,
  powBitsFor,
  solveChallenge,
  verifyChallengeSolution,
} from "./pow";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-pow-unit-tests-0123456789";
});

const NOW = 1_700_000_000_000;

function readSalt(challenge: string): string {
  return JSON.parse(Buffer.from(challenge.split(".")[0], "base64url").toString("utf-8")).salt;
}

describe("leadingZeroBits", () => {
  it("cuenta bits en cero al inicio", () => {
    expect(leadingZeroBits(Buffer.from([0x00, 0x00, 0xff]))).toBe(16);
    expect(leadingZeroBits(Buffer.from([0x00, 0x0f]))).toBe(12);
    expect(leadingZeroBits(Buffer.from([0x80]))).toBe(0);
    expect(leadingZeroBits(Buffer.from([0x01]))).toBe(7);
  });
});

describe("powBitsFor", () => {
  it("sube la dificultad con la presión y topa en el máximo", () => {
    expect([0, 2, 3, 5, 6, 9, 10, 14, 15, 500].map(powBitsFor)).toEqual([16, 16, 19, 19, 21, 21, 23, 23, 24, 24]);
  });
});

describe("issueChallenge / verifyChallengeSolution", () => {
  it("un reto resuelto y con edad suficiente es válido", () => {
    const { challenge, bits } = issueChallenge(16, NOW);
    const solution = solveChallenge(challenge);
    expect(verifyChallengeSolution(challenge, solution, NOW + POW_MIN_AGE_MS + 1)).toMatchObject({ ok: true, bits });
  });

  it("acota la dificultad pedida a [mínimo, máximo]", () => {
    expect(issueChallenge(1, NOW).bits).toBe(POW_MIN_BITS);
    expect(issueChallenge(99, NOW).bits).toBe(POW_MAX_BITS);
  });

  it("rechaza si se envía antes de la edad mínima (script que pide y envía al instante)", () => {
    const { challenge } = issueChallenge(16, NOW);
    expect(verifyChallengeSolution(challenge, solveChallenge(challenge), NOW + 100)).toEqual({ ok: false, reason: "too_fast" });
  });

  it("rechaza un reto expirado", () => {
    const { challenge } = issueChallenge(16, NOW);
    expect(verifyChallengeSolution(challenge, solveChallenge(challenge), NOW + POW_TTL_MS + 1)).toEqual({ ok: false, reason: "expired" });
  });

  it("rechaza una solución sin el trabajo suficiente", () => {
    const { challenge } = issueChallenge(20, NOW);
    // "0" casi nunca cumple 20 bits; si por azar lo hiciera, el reto sería distinto en la próxima corrida.
    const result = verifyChallengeSolution(challenge, "0", NOW + POW_MIN_AGE_MS + 1);
    expect(result.ok === false && result.reason === "insufficient_work").toBe(true);
  });

  it("rechaza una firma alterada (cambiar los bits o el payload)", () => {
    const { challenge } = issueChallenge(24, NOW);
    const [payloadB64, signature] = challenge.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    payload.bits = 16; // el atacante intenta bajar la dificultad
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
    expect(verifyChallengeSolution(forged, "0", NOW + POW_MIN_AGE_MS + 1)).toEqual({ ok: false, reason: "signature" });
  });

  it("rechaza retos malformados sin lanzar", () => {
    for (const bad of ["", "sin-punto", "a.", ".b", "a.b.c"]) {
      const result = verifyChallengeSolution(bad, "1", NOW);
      expect(result.ok).toBe(false);
    }
  });

  it("rechaza soluciones que no son un entero corto", () => {
    const { challenge } = issueChallenge(16, NOW);
    for (const bad of ["", "-1", "1e5", "abc", "1".repeat(16), "1 OR 1=1"]) {
      expect(verifyChallengeSolution(challenge, bad, NOW + POW_MIN_AGE_MS + 1)).toEqual({ ok: false, reason: "invalid_solution" });
    }
  });

  it("dos retos distintos tienen sal distinta", () => {
    expect(readSalt(issueChallenge(16, NOW).challenge)).not.toBe(readSalt(issueChallenge(16, NOW).challenge));
  });
});

interface WorkerScope {
  onmessage?: (event: { data: unknown }) => void;
  postMessage?: (message: unknown) => void;
}

// `new Function` y no `vm.runInNewContext`: medido, el mismo código corre ~70x
// más lento dentro de un contexto de `vm` (sin las optimizaciones del JIT del
// contexto principal) — un reto de 18 bits tardaba 11 s en vez de 150 ms, y no
// refleja lo que hace un navegador real.
function loadWorker(code: string, scope: WorkerScope): void {
  new Function("self", code)(scope);
}

describe("public/pow-worker.js (lo que ejecuta el navegador)", () => {
  function runWorker(salt: string, bits: number): string {
    const code = readFileSync("public/pow-worker.js", "utf-8");
    const worker: WorkerScope = {};
    let result: { solution?: string; error?: string } = {};
    worker.postMessage = (m) => {
      result = m as typeof result;
    };
    loadWorker(code, worker);
    worker.onmessage?.({ data: { salt, bits } });
    if (!result.solution) throw new Error(result.error ?? "el worker no respondió");
    return result.solution;
  }

  it("su SHA-256 coincide con el de Node: la solución del worker la valida el servidor", () => {
    const { challenge, bits } = issueChallenge(18, NOW);
    const solution = runWorker(readSalt(challenge), bits);
    expect(verifyChallengeSolution(challenge, solution, NOW + POW_MIN_AGE_MS + 1)).toMatchObject({ ok: true });
  });

  it("encuentra la misma solución mínima que el solver de referencia", () => {
    const { challenge, bits } = issueChallenge(17, NOW);
    expect(runWorker(readSalt(challenge), bits)).toBe(solveChallenge(challenge));
  });

  it("el hash del worker es SHA-256 estándar (verifica la solución con crypto de Node)", () => {
    const { challenge, bits } = issueChallenge(16, NOW);
    const salt = readSalt(challenge);
    const solution = runWorker(salt, bits);
    expect(leadingZeroBits(createHash("sha256").update(`${salt}:${solution}`).digest())).toBeGreaterThanOrEqual(bits);
  });

  it("rechaza entradas inválidas sin colgarse", () => {
    const code = readFileSync("public/pow-worker.js", "utf-8");
    const worker: WorkerScope = {};
    let result: unknown = null;
    worker.postMessage = (m) => {
      result = m;
    };
    loadWorker(code, worker);
    worker.onmessage?.({ data: { salt: 123, bits: "x" } });
    expect(result).toEqual({ error: "invalid_input" });
  });
});
