/**
 * Fechas de calendario (columnas `DATE`, como texto `YYYY-MM-DD`) contra "hoy"
 * en Bogotá. El servidor corre en UTC: comparar con `new Date()` hacía que una
 * factura "venciera" a las 19:00 hora de Bogotá del día de su vencimiento.
 */
const BOGOTA_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });

/** `YYYY-MM-DD` de hoy en Bogotá. */
export function todayBogota(now: Date = new Date()): string {
  return BOGOTA_DATE.format(now);
}

/** Días enteros de `from` a `to` (ambos `YYYY-MM-DD`); positivo si `to` es posterior. */
export function daysBetweenDates(from: string, to: string): number {
  const f = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const t = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((t - f) / 86_400_000);
}

/** `true` si la fecha de calendario ya pasó (estrictamente antes de hoy en Bogotá). */
export function isBeforeToday(dateOnly: string, now: Date = new Date()): boolean {
  return daysBetweenDates(dateOnly, todayBogota(now)) > 0;
}
