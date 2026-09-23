import { Blueprint, DeviceMobile, Graph, Lightning, TreeStructure } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import projectEstimatorDataEs from "./locales/es/projectEstimator.json";
import projectEstimatorDataEn from "./locales/en/projectEstimator.json";
import projectEstimatorDataFr from "./locales/fr/projectEstimator.json";
import type { Locale } from "@/lib/i18n";

const iconMap: Record<string, Icon> = {
  Blueprint,
  DeviceMobile,
  Graph,
  TreeStructure,
  Lightning,
};

const projectEstimatorByLocale = {
  es: projectEstimatorDataEs,
  en: projectEstimatorDataEn,
  fr: projectEstimatorDataFr,
};

// Precios y duración base: independientes del idioma, se combinan con el copy
// traducido de cada locale por `id`.
const PRICING: Record<string, { priceCop: number; priceUsd: number; baseWeeks: number }> = {
  software: { priceCop: 10_500_000, priceUsd: 2600, baseWeeks: 6 },
  mobile: { priceCop: 8_900_000, priceUsd: 2200, baseWeeks: 5 },
  ai: { priceCop: 11_800_000, priceUsd: 2900, baseWeeks: 6 },
  apis: { priceCop: 5_500_000, priceUsd: 1400, baseWeeks: 3 },
  web: { priceCop: 4_500_000, priceUsd: 1150, baseWeeks: 3 },
};

const ADDON_PRICING: Record<string, { priceCop: number; priceUsd: number; weeks: number }> = {
  auth: { priceCop: 950_000, priceUsd: 250, weeks: 0.5 },
  payments: { priceCop: 1_400_000, priceUsd: 350, weeks: 1 },
  offline: { priceCop: 1_550_000, priceUsd: 390, weeks: 1 },
  security: { priceCop: 1_850_000, priceUsd: 460, weeks: 1 },
  ai_bot: { priceCop: 2_450_000, priceUsd: 620, weeks: 1.5 },
};

export interface ProjectEstimatorType {
  id: string;
  title: string;
  desc: string;
  icon: Icon;
  priceCop: number;
  priceUsd: number;
  baseWeeks: number;
}

export interface ProjectEstimatorAddon {
  id: string;
  title: string;
  priceCop: number;
  priceUsd: number;
  weeks: number;
}

export function getProjectEstimatorContent(locale: Locale) {
  const data = projectEstimatorByLocale[locale];

  return {
    ...data,
    projectTypes: data.projectTypes.map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.desc,
      icon: iconMap[item.iconName] ?? Blueprint,
      ...(PRICING[item.id] ?? { priceCop: 0, priceUsd: 0, baseWeeks: 0 }),
    })) satisfies ProjectEstimatorType[],
    addons: data.addons.map((item) => ({
      id: item.id,
      title: item.title,
      ...(ADDON_PRICING[item.id] ?? { priceCop: 0, priceUsd: 0, weeks: 0 }),
    })) satisfies ProjectEstimatorAddon[],
  };
}

// Moneda por defecto según el mercado principal de cada idioma: COP para
// español (mercado local), USD para inglés/francés (audiencia internacional).
export function getDefaultCurrency(locale: Locale): "COP" | "USD" {
  return locale === "es" ? "COP" : "USD";
}
