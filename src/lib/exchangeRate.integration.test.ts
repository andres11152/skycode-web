import { beforeEach, describe, expect, it } from "vitest";
import { getUsdToCopRate, _resetExchangeRateCacheForTests } from "./exchangeRate";
import { updateSettings } from "./queries/settings";
import { query } from "./db";
import { createTestUser, resetTestDb } from "./testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
  // La caché en memoria de lib/exchangeRate.ts es un singleton de módulo,
  // no se limpia con resetTestDb() (que solo vacía la base) — sin esto un
  // test contamina el siguiente con su tasa cacheada dentro del TTL.
  _resetExchangeRateCacheForTests();
});

describe("getUsdToCopRate — tasa manual (settings.manual_usd_to_cop_rate)", () => {
  it("cuando hay una tasa manual fijada, la devuelve sin tocar la API externa ni exchange_rates", async () => {
    const user = await createTestUser();
    await updateSettings({ manual_usd_to_cop_rate: 4321.5 }, user.id);

    const rate = await getUsdToCopRate();
    expect(rate).toBe(4321.5);

    // No debió insertar nada en exchange_rates: la tasa manual evita por
    // completo el camino de la API en vivo / caché en base.
    const cached = await query(`SELECT COUNT(*) AS total FROM exchange_rates;`);
    expect(Number(cached.rows[0].total)).toBe(0);
  });

  it("sin tasa manual (default NULL), usa la caché vigente en exchange_rates en vez de la API en vivo", async () => {
    // Nunca se llama a la red en este test: se siembra una fila reciente
    // en `exchange_rates` para que getUsdToCopRate() la use directamente
    // (misma técnica que el resto de la suite evita golpear open.er-api.com).
    await query(
      `INSERT INTO exchange_rates (from_currency, to_currency, rate, source, fetched_at) VALUES ('USD', 'COP', 3987.25, 'test-seed', now());`
    );

    const rate = await getUsdToCopRate();
    expect(rate).toBe(3987.25);
  });
});
