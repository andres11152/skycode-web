import { BadgeCheck, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import highlightsDataEs from "./locales/es/highlights.json";
import highlightsDataEn from "./locales/en/highlights.json";
import highlightsDataFr from "./locales/fr/highlights.json";
import type { Locale } from "@/lib/i18n";

const iconMap: Record<string, LucideIcon> = {
  Users,
  BadgeCheck,
  ShieldCheck,
};

const highlightsByLocale = { es: highlightsDataEs, en: highlightsDataEn, fr: highlightsDataFr };

export function getHighlightsContent(locale: Locale) {
  const data = highlightsByLocale[locale];
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      icon: iconMap[item.iconName] ?? Users,
    })),
  };
}
