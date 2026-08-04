import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
