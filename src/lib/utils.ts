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

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(isoDate: string) {
  return dateFormatter.format(new Date(isoDate));
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
