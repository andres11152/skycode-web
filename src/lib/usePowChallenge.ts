"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cliente del proof-of-work de las superficies de autenticación (ver
// lib/pow.ts y lib/authShield.ts en el servidor). Pide un reto firmado y lo
// resuelve en un Web Worker (`/pow-worker.js`) para no congelar la interfaz.
// Se prepara EN SEGUNDO PLANO apenas carga el formulario: cuando la persona
// termina de escribir y envía, el reto ya está resuelto y el envío no espera.

export type AuthSurface = "login" | "verify-2fa" | "forgot-password" | "reset-password" | "team-accept";

export interface PowSolution {
  challenge: string;
  solution: string;
}

export type PowStatus = "preparing" | "ready" | "error";

interface IssuedChallenge {
  challenge: string;
  bits: number;
  minAgeMs: number;
}

/** El servidor acepta identificadores de hasta 254 caracteres. */
function normalizeIdentifier(identifier?: string): string | undefined {
  const value = identifier?.trim().toLowerCase().slice(0, 254);
  return value ? value : undefined;
}

async function fetchChallenge(surface: AuthSurface, identifier?: string): Promise<IssuedChallenge> {
  const res = await fetch("/api/auth/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface, identifier: normalizeIdentifier(identifier) }),
  });
  if (!res.ok) throw new Error(res.status === 429 ? "rate_limited" : "challenge_failed");
  return (await res.json()) as IssuedChallenge;
}

function readSalt(challenge: string): string {
  const payloadB64 = challenge.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(atob(payloadB64)) as { salt: string };
  return payload.salt;
}

function runWorker(salt: string, bits: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker("/pow-worker.js");
    } catch (error) {
      reject(error);
      return;
    }
    worker.onmessage = (event: MessageEvent<{ solution?: string; error?: string }>) => {
      worker.terminate();
      if (event.data.solution) resolve(event.data.solution);
      else reject(new Error(event.data.error ?? "worker_failed"));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "worker_failed"));
    };
    worker.postMessage({ salt, bits });
  });
}

async function solve(surface: AuthSurface, identifier?: string): Promise<PowSolution> {
  const issued = await fetchChallenge(surface, identifier);
  const issuedAt = Date.now();
  const solution = await runWorker(readSalt(issued.challenge), issued.bits);
  // El servidor rechaza un reto enviado antes de `minAgeMs` de emitido (frena
  // a un script que pide y envía al instante). Casi nunca hay espera real: la
  // persona tarda más que eso en escribir.
  const remaining = issued.minAgeMs + 50 - (Date.now() - issuedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return { challenge: issued.challenge, solution };
}

/**
 * Prepara y entrega pruebas de trabajo para una superficie. Uso:
 *
 *   const pow = usePowChallenge("login");
 *   const res = await pow.submit(email, (p) => fetch(url, { body: JSON.stringify({ ..., pow: p }) }));
 *
 * `submit` consume la prueba preparada; si el servidor responde `pow_required`
 * (la dificultad subió por fallos recientes de esa IP/cuenta), pide una nueva
 * con el identificador y reintenta sola (hasta 3 veces). Cada reto sirve UNA
 * sola vez, así que tras cada envío se vuelve a preparar el siguiente.
 */
export function usePowChallenge(surface: AuthSurface, { enabled = true }: { enabled?: boolean } = {}) {
  const [status, setStatus] = useState<PowStatus>("preparing");
  const pending = useRef<Promise<PowSolution> | null>(null);
  const mounted = useRef(true);

  const prepare = useCallback(
    (identifier?: string) => {
      setStatus("preparing");
      const promise = solve(surface, identifier);
      pending.current = promise;
      promise.then(
        () => {
          if (mounted.current && pending.current === promise) setStatus("ready");
        },
        () => {
          if (mounted.current && pending.current === promise) setStatus("error");
        },
      );
      return promise;
    },
    [surface],
  );

  useEffect(() => {
    mounted.current = true;
    // `enabled: false` (ej. el paso de 2FA antes de que exista un pendingToken)
    // evita pedir y resolver un reto que nadie va a usar todavía.
    // En un microtask (no directo en el cuerpo del efecto): `prepare` hace
    // setState y la regla `react-hooks/set-state-in-effect` lo marca si va
    // síncrono acá — mismo patrón que CookieBanner.
    if (enabled) {
      queueMicrotask(() => {
        if (mounted.current) void prepare().catch(() => undefined);
      });
    }
    return () => {
      mounted.current = false;
    };
  }, [prepare, enabled]);

  const submit = useCallback(
    async (identifier: string | undefined, send: (pow: PowSolution) => Promise<Response>): Promise<Response> => {
      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        // Primer intento: la prueba ya preparada (si no hay, se pide una).
        // Reintentos: una fresca con el identificador, para que el servidor
        // calcule la dificultad real.
        const powPromise = attempt === 0 && pending.current ? pending.current : prepare(identifier);
        pending.current = null;
        const pow = await powPromise;
        res = await send(pow);

        if (res.status !== 403) break;
        const data = (await res.clone().json().catch(() => null)) as { code?: string } | null;
        if (data?.code !== "pow_required") break;
      }

      // El reto usado ya no sirve: se deja listo el siguiente (p. ej. tras una
      // contraseña incorrecta la persona vuelve a intentar sin esperar).
      if (mounted.current) void prepare(identifier).catch(() => undefined);
      return res as Response;
    },
    [prepare],
  );

  return { status, submit };
}
