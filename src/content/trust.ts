import trustDataEs from "./locales/es/trust.json";
import trustDataEn from "./locales/en/trust.json";
import trustDataFr from "./locales/fr/trust.json";
import type { Locale } from "@/lib/i18n";

/**
 * Un compromiso de la franja amarilla. Si trae `stat`, se muestra como cifra grande que cuenta al
 * entrar en pantalla (`unit` pegado a la cifra, `statLabel` debajo). Solo cifras ya publicadas en el
 * sitio (garantía, propiedad del código, sin intermediarios): no se inventan números nuevos aquí.
 */
export interface TrustItem {
  label: string;
  stat?: number;
  unit?: string;
  statLabel?: string;
}

const trustByLocale = { es: trustDataEs, en: trustDataEn, fr: trustDataFr };

export function getTrustContent(locale: Locale): { ariaLabel: string; items: TrustItem[] } {
  return trustByLocale[locale];
}
