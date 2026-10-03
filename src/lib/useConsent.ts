"use client";

import { useSyncExternalStore } from "react";
import { clearAttribution } from "@/lib/attribution";
import { clearGeoCountryCache } from "@/lib/useGeoCountry";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  OPEN_PREFERENCES_EVENT,
  readRawConsent,
  buildConsentRecord,
  parseConsentRecord,
  type ConsentChoices,
  type ConsentRecord,
} from "@/lib/consent";

/**
 * Lectura/escritura del consentimiento sobre `localStorage`, expuesta como
 * store externo para que cualquier componente reaccione al cambio sin props.
 *
 * `getSnapshot` devuelve la cadena cruda y se parsea fuera: `useSyncExternalStore`
 * compara snapshots con `Object.is`, y un objeto nuevo en cada lectura causaría
 * un bucle de renders.
 */

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONSENT_STORAGE_KEY) onChange();
  };
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** `undefined` en el servidor y en la hidratación: aún no se sabe, no se muestra ni se asume nada. */
export function useConsentRecord(): ConsentRecord | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    readRawConsent,
    () => undefined,
  );
  if (raw === undefined) return undefined;
  return parseConsentRecord(raw);
}

export function saveConsent(choices: ConsentChoices): ConsentRecord {
  const record = buildConsentRecord(choices);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Sin almacenamiento la elección rige solo en esta visita (el evento igual se emite).
  }
  // Apagar una categoría borra lo ya guardado: retirar el consentimiento sin
  // limpiar sería solo cosmético.
  if (!choices.measurement) clearAttribution();
  if (!choices.preferences) clearGeoCountryCache();
  window.dispatchEvent(new Event(CONSENT_EVENT));
  return record;
}

/** Reabre el centro de preferencias (enlace del Footer y de la Política de Cookies). */
export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

