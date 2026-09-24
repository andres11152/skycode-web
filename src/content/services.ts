import {
  Blueprint,
  DeviceMobile,
  Graph,
  Handshake,
  Lightning,
  ShieldCheck,
  Storefront,
  Swap,
  TreeStructure,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import servicesDataEs from "./locales/es/services.json";
import servicesDataEn from "./locales/en/services.json";
import servicesDataFr from "./locales/fr/services.json";
import type { Locale } from "@/lib/i18n";

// Ícono de servicio (tarjeta del carrusel y portada de la página de detalle).
// Phosphor, no Lucide: los glifos se renderizan en `weight="duotone"`, que da
// una segunda capa donde entra el azul de marca — un stroke plano a 22px
// dentro de un contenedor de 48px se veía vacío (ver CLAUDE.md).
//
// Las claves NO son el nombre literal del concepto del servicio a propósito.
// El set anterior (Lucide) era un mapeo literal sustantivo→glifo: `Code2`
// para "software", `Plug` para "integraciones", `BrainCircuit` para "IA" — el patrón
// exacto que hace que un sitio se vea generado por IA. Cada ícono acá apunta
// al *valor* del servicio, no a su sustantivo:
//   Blueprint     -> se diseña a medida, no se escribe código genérico
//   TreeStructure -> sistemas conectados entre sí, no un enchufe
//   Lightning     -> el diferenciador del servicio es la velocidad, no "una ventana"
//   Handshake     -> el entregable real es la transferencia, no "capas"
//   Swap          -> migrar/reemplazar lo viejo, no "una base de datos"
//   Graph         -> un modelo aplicado, no un cerebro con circuitos
// ShieldCheck, DeviceMobile y Storefront sí se quedan literales: ahí el
// glifo canónico es el correcto (seguridad, plataforma móvil, tienda en
// línea). ShieldCheck además ya no se repite en Highlights, donde antes
// aparecía por tercera vez.
const iconMap: Record<string, Icon> = {
  Blueprint,
  TreeStructure,
  Lightning,
  ShieldCheck,
  Handshake,
  DeviceMobile,
  Swap,
  Graph,
  Storefront,
};

const servicesByLocale = { es: servicesDataEs, en: servicesDataEn, fr: servicesDataFr };

export interface Service {
  slug: string;
  title: string;
  description: string;
  coverIcon: Icon;
  features: string[];
}

export function getServicesContent(locale: Locale) {
  const servicesData = servicesByLocale[locale];
  return {
    servicesSection: {
      badge: servicesData.badge,
      title: servicesData.title,
      description: servicesData.description,
      viewAll: servicesData.viewAll,
    },
    services: servicesData.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      coverIcon: iconMap[item.iconName] ?? Blueprint,
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
