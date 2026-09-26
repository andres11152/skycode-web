import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Verifica el header `x-cron-secret` contra `CRON_SECRET` en tiempo
 * constante — antes cada una de las 7 rutas de `/api/cron/*` comparaba con
 * `!==` directo, que hace short-circuit en el primer byte distinto y deja
 * un canal de timing (mismo tipo de fuga que `comparePassword`/
 * `verifyBoldWebhookSignature`/`timingSafeEqualStrings` ya cierran en el
 * resto del proyecto). El riesgo es menor que el de una contraseña —un
 * atacante necesitaría de todos modos adivinar un secreto largo generado a
 * mano, no una clave corta de 6 dígitos— pero el mismo principio de "nunca
 * comparar un secreto con `===`" aplica igual acá.
 *
 * Devuelve la respuesta de error lista para retornar (503 sin
 * `CRON_SECRET` configurado, 401 si no coincide) o `null` si la llamada
 * está autorizada.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor." }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-cron-secret")?.trim() ?? "";

  const expectedBuf = Buffer.from(expectedSecret);
  const providedBuf = Buffer.from(providedSecret);

  // Longitudes distintas harían que `timingSafeEqual` lance en vez de
  // comparar — mismo criterio que `verifyBoldWebhookSignature` en
  // lib/bold.ts: cualquier longitud distinta a la esperada ya es
  // suficiente para rechazar, sin necesidad de comparación byte a byte.
  const isValid = expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);

  if (!isValid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return null;
}
