/**
 * Modelo del consentimiento de cookies — módulo puro (sin DOM ni React) para
 * poder probarlo sin navegador. El acceso a `localStorage` y la suscripción
 * viven en `useConsent.ts`.
 *
 * Reglas que este módulo garantiza:
 *  - "Necesarias" siempre es `true` y no se puede apagar.
 *  - Un registro con otra `version` se trata como "sin decisión": si la
 *    política cambia de fondo, se vuelve a preguntar.
 *  - Cualquier valor ilegible o manipulado equivale a "sin decisión", nunca a
 *    "aceptado".
 */

/** Subir este número vuelve a mostrar el aviso a todos los visitantes. */
export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "skycode-consent";
export const CONSENT_EVENT = "skycode:consent-change";
/** Evento para reabrir el centro de preferencias desde el Footer o la política. */
export const OPEN_PREFERENCES_EVENT = "skycode:open-cookie-preferences";

export interface ConsentChoices {
  preferences: boolean;
  measurement: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  version: number;
  necessary: true;
  /** ISO 8601 — cuándo decidió la persona. */
  decidedAt: string;
}

export const CONSENT_DENIED: ConsentChoices = { preferences: false, measurement: false };
export const CONSENT_ALL: ConsentChoices = { preferences: true, measurement: true };

export function buildConsentRecord(choices: ConsentChoices, now: Date = new Date()): ConsentRecord {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    preferences: choices.preferences,
    measurement: choices.measurement,
    decidedAt: now.toISOString(),
  };
}

export function parseConsentRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== CONSENT_VERSION) return null;
  if (typeof candidate.preferences !== "boolean") return null;
  if (typeof candidate.measurement !== "boolean") return null;
  if (typeof candidate.decidedAt !== "string" || Number.isNaN(Date.parse(candidate.decidedAt))) {
    return null;
  }
  return {
    version: CONSENT_VERSION,
    necessary: true,
    preferences: candidate.preferences,
    measurement: candidate.measurement,
    decidedAt: candidate.decidedAt,
  };
}

/** `true` solo si hay una decisión vigente que permite la categoría. */
export function isCategoryAllowed(
  record: ConsentRecord | null,
  category: "preferences" | "measurement",
): boolean {
  return record !== null && record[category];
}

function readRawConsent(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    // Modo privado estricto / almacenamiento bloqueado: sin decisión guardada.
    return null;
  }
}

/** Lectura puntual, solo navegador (en el servidor siempre es "sin decisión"). */
export function readConsentNow(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  return parseConsentRecord(readRawConsent());
}

/** Cadena cruda para `useSyncExternalStore` (ver useConsent.ts). */
export { readRawConsent };
