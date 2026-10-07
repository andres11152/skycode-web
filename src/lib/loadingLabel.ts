import type { Locale } from "@/lib/i18n";

/**
 * Texto accesible de los skeletons de carga ("Cargando…"). Vive aquí y no en `ui.json` a
 * propósito: los skeletons van en el JS inicial de la home, e importar `getUiContent` desde
 * ellos arrastraría el JSON completo de los tres idiomas solo para leer una palabra.
 */
export const LOADING_LABEL: Record<Locale, string> = {
  es: "Cargando…",
  en: "Loading…",
  fr: "Chargement…",
};
