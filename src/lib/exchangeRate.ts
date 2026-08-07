import { query } from "./db";

// La API fuente (open.er-api.com) actualiza sus tasas una vez al día — un
// TTL de 12h es suficiente margen sin pegarle a la API en cada request.
const RATE_TTL_MS = 12 * 60 * 60 * 1000;
// Solo como último recurso si nunca hubo un fetch exitoso NI una fila
// previa en `exchange_rates` (ej. primer arranque sin salida a internet).
// Una tasa aproximada es mejor que reventar el reporte de rentabilidad.
const FALLBACK_USD_TO_COP = 4000;

interface CachedRate {
  rate: number;
  expiresAtMs: number;
}

let memoryCache: CachedRate | null = null;

async function fetchLiveUsdToCopRate(): Promise<number> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`La API de tasas de cambio respondió ${res.status}`);
  }
  const data = await res.json();
  const rate = data?.rates?.COP;
  if (typeof rate !== "number" || rate <= 0) {
    throw new Error("Respuesta de tasa de cambio con formato inesperado");
  }
  return rate;
}

/**
 * Cuántos COP vale 1 USD, en vivo — nunca hardcodeado. Se cachea en
 * memoria por instancia y se persiste en `exchange_rates` (así una
 * instancia nueva en frío no espera un fetch externo antes de poder
 * calcular un reporte). Si el fetch en vivo falla, cae a la última tasa
 * conocida en base de datos aunque esté vencida — mejor una tasa de ayer
 * que un reporte roto.
 *
 * Server-only (importa `query`, que a su vez importa `pg`) — para el tipo
 * `Currency` y `convertCurrency` (usables en cliente), ver lib/currency.ts.
 */
export async function getUsdToCopRate(): Promise<number> {
  if (memoryCache && memoryCache.expiresAtMs > Date.now()) {
    return memoryCache.rate;
  }

  const cachedRes = await query(
    `SELECT rate, fetched_at FROM exchange_rates WHERE from_currency = 'USD' AND to_currency = 'COP' ORDER BY fetched_at DESC LIMIT 1;`
  );
  const cached = cachedRes.rows[0] as { rate: string; fetched_at: string } | undefined;
  const cachedAgeMs = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity;

  if (cached && cachedAgeMs < RATE_TTL_MS) {
    const rate = Number(cached.rate);
    memoryCache = { rate, expiresAtMs: Date.now() + (RATE_TTL_MS - cachedAgeMs) };
    return rate;
  }

  try {
    const rate = await fetchLiveUsdToCopRate();
    await query(
      `INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES ('USD', 'COP', $1, 'open.er-api.com');`,
      [rate]
    );
    memoryCache = { rate, expiresAtMs: Date.now() + RATE_TTL_MS };
    return rate;
  } catch (error) {
    console.error("⚠️ [Exchange Rate] Falló el fetch en vivo, usando respaldo.", error);
    if (cached) {
      const rate = Number(cached.rate);
      // TTL corto: reintenta el fetch en vivo pronto en vez de quedarse
      // atascado con una tasa vieja por otras 12h.
      memoryCache = { rate, expiresAtMs: Date.now() + 5 * 60 * 1000 };
      return rate;
    }
    return FALLBACK_USD_TO_COP;
  }
}
