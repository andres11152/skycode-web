import type { Locale } from "@/lib/i18n";

/** Secciones de la home que aparecen en el indicador lateral, en orden de página. Cada `id` existe como ancla. */
export const HOME_RAIL_SECTIONS = [
  "inicio",
  "por-que",
  "servicios",
  "portfolio",
  "proceso",
  "cotizador",
  "testimonios",
  "blog",
  "faq",
  "contacto",
] as const;

/**
 * Etiquetas del indicador. Viven aquí y no en `ui.json` por la misma razón que `loadingLabel.ts`:
 * el indicador va en el JS inicial de la home y no debe arrastrar JSON de tres idiomas.
 */
export const RAIL_COPY: Record<Locale, { aria: string; labels: Record<(typeof HOME_RAIL_SECTIONS)[number], string> }> = {
  es: {
    aria: "Secciones de la página",
    labels: {
      inicio: "Inicio",
      "por-que": "Por qué SkyCode",
      servicios: "Servicios",
      portfolio: "Casos",
      proceso: "Proceso",
      cotizador: "Cotizador",
      testimonios: "Clientes",
      blog: "Blog",
      faq: "Preguntas",
      contacto: "Contacto",
    },
  },
  en: {
    aria: "Page sections",
    labels: {
      inicio: "Home",
      "por-que": "Why SkyCode",
      servicios: "Services",
      portfolio: "Work",
      proceso: "Process",
      cotizador: "Estimator",
      testimonios: "Clients",
      blog: "Blog",
      faq: "FAQ",
      contacto: "Contact",
    },
  },
  fr: {
    aria: "Sections de la page",
    labels: {
      inicio: "Accueil",
      "por-que": "Pourquoi SkyCode",
      servicios: "Services",
      portfolio: "Réalisations",
      proceso: "Processus",
      cotizador: "Estimateur",
      testimonios: "Clients",
      blog: "Blog",
      faq: "Questions",
      contacto: "Contact",
    },
  },
};
