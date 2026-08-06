import {
  AppWindow,
  BrainCircuit,
  Code2,
  Database,
  Layers,
  Plug,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import servicesDataEs from "./locales/es/services.json";
import servicesDataEn from "./locales/en/services.json";
import servicesDataFr from "./locales/fr/services.json";
import type { Locale } from "@/lib/i18n";

// Ícono de servicio (tarjeta del carrusel y portada de la página de detalle) —
// Lucide, no LordIcon: se quitó la dependencia externa (CDN de terceros,
// 320KB de lottie-web, console.log en producción, ver CLAUDE.md).
const iconMap: Record<string, LucideIcon> = {
  Code2,
  Plug,
  AppWindow,
  ShieldCheck,
  Layers,
  Smartphone,
  Database,
  BrainCircuit,
};

const servicesByLocale = { es: servicesDataEs, en: servicesDataEn, fr: servicesDataFr };

export interface Service {
  slug: string;
  title: string;
  description: string;
  coverIcon: LucideIcon;
  features: string[];
}

export function getServicesContent(locale: Locale) {
  const servicesData = servicesByLocale[locale];
  return {
    servicesSection: {
      badge: servicesData.badge,
      title: servicesData.title,
      description: servicesData.description,
    },
    services: servicesData.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      coverIcon: iconMap[item.iconName] ?? Code2,
      features: item.features,
    })) satisfies Service[],
  };
}

export function getServiceBySlug(slug: string, locale: Locale = "es"): Service | undefined {
  return getServicesContent(locale).services.find((service) => service.slug === slug);
}

// Español por defecto — usado por JSON-LD y por las páginas de detalle (mismo
// patrón ES-only que ya aplica al blog y a lo legal, ver AGENTS.md).
export const servicesSection = getServicesContent("es").servicesSection;
export const services = getServicesContent("es").services;
