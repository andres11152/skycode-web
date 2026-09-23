import { LockKey, SealCheck, UsersThree } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import highlightsDataEs from "./locales/es/highlights.json";
import highlightsDataEn from "./locales/en/highlights.json";
import highlightsDataFr from "./locales/fr/highlights.json";
import type { Locale } from "@/lib/i18n";

const iconMap: Record<string, Icon> = {
  UsersThree,
  SealCheck,
  LockKey,
};

const highlightsByLocale = { es: highlightsDataEs, en: highlightsDataEn, fr: highlightsDataFr };

export function getHighlightsContent(locale: Locale) {
  const data = highlightsByLocale[locale];
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      icon: iconMap[item.iconName] ?? UsersThree,
    })),
  };
}
