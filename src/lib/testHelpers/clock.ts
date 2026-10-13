import { todayBogota } from "../dateOnly";

/**
 * Reloj fijo para los tests que dependen de "hoy". Es un instante donde la fecha UTC y la de Bogotá DIFIEREN
 * (03:30 UTC del 15 de junio = 22:30 del 14 en Bogotá): así un cálculo en UTC falla siempre, no solo entre las 19:00 y
 * la medianoche, y los tests no dependen de la hora a la que se corran. El código de producción recibe este `now`
 * como parámetro (`notifyLeadFollowUps(now)`, `generateDueRetainerInvoices(now)`…); por defecto usa el reloj real.
 */
export const CLOCK = new Date("2026-06-15T03:30:00.000Z");

/** `YYYY-MM-DD` de "hoy" en Bogotá según `CLOCK` (2026-06-14). */
export const TODAY = todayBogota(CLOCK);

/** `TODAY` desplazado `days` días (`YYYY-MM-DD`). */
export function dayOffset(days: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
