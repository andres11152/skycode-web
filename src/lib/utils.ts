import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONEY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  COP: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
};

/**
 * Única fuente de formateo de dinero del panel — antes duplicada en seis
 * componentes distintos, cada uno formateando siempre en `es-CO`/COP sin
 * importar la moneda real del dato. USD usa 2 decimales (convención del
 * dólar); COP usa 0 (nadie cotiza en centavos de peso).
 */
export function formatMoney(amount: number, currency: Currency): string {
  return MONEY_FORMATTERS[currency].format(amount);
}

// `timeZone` fijo a propósito: sin esto, `Intl.DateTimeFormat` resuelve al
// timezone del entorno donde corre — UTC en el servidor, el del navegador
// en el cliente. Para un `publishedAt` con hora real (no solo fecha, ver
// `toIsoString()` en lib/queries/articles.ts) cuya marca UTC caiga cerca de
// medianoche, servidor y cliente pueden calcular un día calendario distinto
// ("25 de septiembre" vs. "26 de septiembre") — mismatch de texto puro que
// dispara el error de hidratación de React #418 (bug real, reportado por un
// visitante). Fijarlo hace el resultado determinista sin importar dónde
// corra ni la zona horaria del visitante.
const DATE_LOCALES = { es: "es-CO", en: "en-US", fr: "fr-FR" } as const;

const dateFormatters = Object.fromEntries(
  Object.entries(DATE_LOCALES).map(([locale, tag]) => [
    locale,
    new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }),
  ]),
) as Record<keyof typeof DATE_LOCALES, Intl.DateTimeFormat>;

/** `locale` por defecto `es`: los llamadores que no lo pasan conservan el formato de siempre. */
export function formatDate(isoDate: string, locale: keyof typeof DATE_LOCALES = "es") {
  // `YYYY-MM-DD` es una fecha de calendario, no un instante: `new Date()` la
  // toma como medianoche UTC y en Bogotá (UTC-5) se mostraba el día anterior.
  // A mediodía de Bogotá cae en el mismo día en cualquier zona.
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? new Date(`${isoDate}T12:00:00-05:00`) : new Date(isoDate);
  return dateFormatters[locale].format(instant);
}

// Formatos compactos del panel interno/portal (solo es-CO). Antes había 33
// `toLocaleDateString` a mano con tres criterios distintos de zona horaria,
// y los campos `DATE` (vencimientos, fecha de gasto, de horas) se mostraban
// un día antes en Colombia: `new Date("2026-10-06")` es medianoche UTC.
const PANEL_TZ = "America/Bogota";
const shortDateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: PANEL_TZ });
const dayMonthFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: PANEL_TZ });
const monthYearFormatter = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: PANEL_TZ });
const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: PANEL_TZ,
});
const dayTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: PANEL_TZ,
});
const numberFormatter = new Intl.NumberFormat("es-CO");

/**
 * Columna `DATE` de Postgres (fecha de calendario, no instante). Toma solo
 * `YYYY-MM-DD` aunque llegue serializada como `2026-10-06T00:00:00.000Z`
 * (así devuelve `pg` un DATE sin `::text`) y la ancla a mediodía de Bogotá,
 * así nunca cruza al día anterior.
 */
function calendarInstant(value: string): Date {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
  return day ? new Date(`${day}T12:00:00-05:00`) : new Date(value);
}

function timestampInstant(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarInstant(value) : new Date(value);
}

export type CalendarDateStyle = "short" | "dayMonth" | "monthYear";

const CALENDAR_FORMATTERS: Record<CalendarDateStyle, Intl.DateTimeFormat> = {
  short: shortDateFormatter,
  dayMonth: dayMonthFormatter,
  monthYear: monthYearFormatter,
};

/** Para columnas `DATE` (vencimiento, fecha de gasto/horas, ingreso): "6 de oct de 2026". */
export function formatCalendarDate(value: string, style: CalendarDateStyle = "short"): string {
  return CALENDAR_FORMATTERS[style].format(calendarInstant(value));
}

/** Para `TIMESTAMPTZ` (creado, actualizado), en hora de Bogotá: "6 de oct de 2026". */
export function formatShortDate(value: string, style: CalendarDateStyle = "short"): string {
  return CALENDAR_FORMATTERS[style].format(timestampInstant(value));
}

/** Para `TIMESTAMPTZ` cuando la hora importa (actividad, sesiones, auditoría): "6 de oct de 2026, 3:45 p. m.". */
export function formatDateTime(value: string, style: "full" | "dayTime" = "full"): string {
  // `dayTime` ("6 de oct, 3:45 p. m.") para plazos cercanos (SLA), donde el año es ruido.
  return (style === "dayTime" ? dayTimeFormatter : dateTimeFormatter).format(timestampInstant(value));
}

const compactCopFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Pesos abreviados para etiquetas de gráfica donde el monto completo no cabe: "$ 12,5 M". */
export function formatCompactCop(value: number): string {
  return compactCopFormatter.format(value);
}

/** Enteros y decimales con separadores de es-CO: "1.234.567". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CSV_FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Formatea un valor como celda CSV entrecomillada. Antepone un `'` cuando el
 * valor empieza con un carácter que Excel/Sheets interpreta como fórmula
 * (mitigación estándar de CSV injection para datos de origen no confiable).
 */
export function toCsvCell(value: string | number): string {
  const stringValue = String(value ?? "");
  const needsFormulaGuard = CSV_FORMULA_TRIGGERS.some((prefix) => stringValue.startsWith(prefix));
  const guarded = needsFormulaGuard ? `'${stringValue}` : stringValue;
  return `"${guarded.replace(/"/g, '""')}"`;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapa un string de origen no confiable (ej. lo que escribió un visitante
 * en un formulario) antes de interpolarlo dentro de HTML generado a mano —
 * necesario para el correo de confirmación de lead (lib/leadConfirmationEmail.ts),
 * que arma su propio HTML sin pasar por React/JSX (Resend recibe un string).
 * Sin esto, un nombre o mensaje con `<img src=x onerror=...>` se ejecutaría
 * como HTML/script real en el cliente de correo de quien lo reciba.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
