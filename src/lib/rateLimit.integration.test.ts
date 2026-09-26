import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited } from "./rateLimit";
import { resetTestDb } from "./testHelpers/db";

// isRateLimited() ahora vive en Postgres (ver el comentario en
// lib/rateLimit.ts sobre por qué la versión en memoria no servía con más
// de una instancia), así que su comportamiento se prueba acá, contra la
// base de prueba real, en vez de en rateLimit.test.ts — mismo criterio que
// cualquier otra función de `lib/queries/*` que toca la base.
beforeEach(async () => {
  await resetTestDb();
});

describe("isRateLimited", () => {
  it("allows requests under the limit and blocks once it's reached", async () => {
    const key = "test:under-limit";
    expect(await isRateLimited(key, 3, 60_000)).toBe(false);
    expect(await isRateLimited(key, 3, 60_000)).toBe(false);
    expect(await isRateLimited(key, 3, 60_000)).toBe(false);
    expect(await isRateLimited(key, 3, 60_000)).toBe(true);
  });

  it("tracks separate buckets per key", async () => {
    await isRateLimited("test:bucket-a", 1, 60_000);
    expect(await isRateLimited("test:bucket-b", 1, 60_000)).toBe(false);
  });

  it("resets the count once the window has elapsed", async () => {
    const key = "test:window-reset";
    // Ventana de 1ms: la siguiente llamada, aunque sea inmediata, ya cae
    // fuera de la ventana anterior — evita depender de un `sleep` real en
    // el test para probar que la ventana expira.
    expect(await isRateLimited(key, 1, 1)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await isRateLimited(key, 1, 1)).toBe(false);
  });
});
