import bogotaDataEs from "./locales/es/bogota.json";
import { PRICING } from "./projectEstimator";
import { fillPricingTokens, formatPriceCop } from "./pricingTokens";
import { withoutTodos } from "@/lib/todoPlaceholders";

// Página local `/desarrollo-software-bogota` — SOLO en español, a propósito:
// la búsqueda local ("desarrollo de software en Bogotá") es en español, así
// que no hay `bogota.json` en en/fr ni hreflang cruzado (mismo criterio que
// los documentos legales). Desde la home en /en y /fr se enlaza a la misma
// página con la insignia ES.
//
// Todo el copy vive en `locales/es/bogota.json`; este módulo lo tipa y resuelve
// los PRECIOS Y PLAZOS desde el cotizador público (`PRICING` en
// projectEstimator.ts): una sola fuente de verdad, así la página y el
// cotizador nunca muestran cifras distintas. En el JSON los valores se
// escriben como tokens (`{price.web}`, `{priceShort.web}`, `{weeks.web}`).
// La regla de los marcadores `{{TODO: …}}` (lib/todoPlaceholders.ts) sigue
// aplicando a las preguntas por si se agrega alguno.

export interface BogotaStat {
  value: string;
  unit?: string;
  label: string;
  text: string;
}

export interface BogotaClock {
  city: string;
  tz: string;
  home: boolean;
}

export interface BogotaPillar {
  title: string;
  text: string;
}

export interface BogotaAboutPillar extends BogotaPillar {
  /** Qué visual lleva la tarjeta: ownership | direct | local | timezone. */
  key: string;
}

/** Un tipo de proyecto con su precio base y plazo, resueltos desde el cotizador. */
export interface BogotaPlan {
  id: string;
  label: string;
  text: string;
  /** Precio base formateado, p. ej. "$4.500.000 COP". */
  price: string;
  priceCop: number;
  weeks: number;
}

export interface BogotaServiceItem {
  slug: string;
  anchor: string;
  text: string;
}

export interface BogotaCaseItem {
  slug: string;
  name: string;
  sector: string;
  text: string;
}

export interface BogotaStep {
  title: string;
  text: string;
}

export interface BogotaFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface BogotaContent {
  meta: { title: string; description: string };
  breadcrumb: { home: string; aria: string; current: string };
  hero: {
    eyebrow: string;
    h1: string;
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badge: string;
    globeLabel: string;
    clocksLabel: string;
    clocks: BogotaClock[];
  };
  stats: { label: string; items: BogotaStat[] };
  tocLabel: string;
  about: {
    id: string;
    tocLabel: string;
    heading: string;
    paragraphs: string[];
    pillars: BogotaAboutPillar[];
    visuals: {
      repoLines: string[];
      directLabel: string;
      directPeople: { initial: string; name: string }[];
      localChips: string[];
    };
  };
  testimonials: { eyebrow: string; heading: string };
  services: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    items: BogotaServiceItem[];
    allLabel: string;
    viewLabel: string;
  };
  cases: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    caseLabel: string;
    items: BogotaCaseItem[];
    allLabel: string;
    viewLabel: string;
  };
  process: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    steps: BogotaStep[];
    closing: string[];
  };
  compliance: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    principles: BogotaPillar[];
    closing: string;
    mockupLabel: string;
  };
  pricing: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    launchNote: string;
    plansHeading: string;
    fromLabel: string;
    baseNote: string;
    plans: BogotaPlan[];
    factorsHeading: string;
    factors: string[];
    paymentNote: string;
    estimatorText: string;
    estimatorCta: string;
  };
  timelines: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    rangesHeading: string;
    weeksUnit: string;
    note: string;
  };
  faq: { id: string; tocLabel: string; heading: string; items: BogotaFaqItem[] };
  cta: { heading: string; body: string; primary: string; secondary: string };
}

type RawBogotaPlan = Omit<BogotaPlan, "price" | "priceCop" | "weeks">;

/** Forma del JSON: igual que `BogotaContent`, pero con los planes sin precio ni plazo (salen del cotizador). */
type RawBogotaContent = Omit<BogotaContent, "pricing"> & {
  pricing: Omit<BogotaContent["pricing"], "plans"> & { plans: RawBogotaPlan[] };
};

const raw: RawBogotaContent = bogotaDataEs;

function resolvePlans(plans: RawBogotaPlan[]): BogotaPlan[] {
  return plans.map((plan) => {
    const entry = PRICING[plan.id];
    if (!entry) throw new Error(`bogota.json: el plan "${plan.id}" no existe en PRICING (projectEstimator.ts)`);
    return { ...plan, price: formatPriceCop(entry.priceCop), priceCop: entry.priceCop, weeks: entry.baseWeeks };
  });
}

/** Contenido tal cual está en el JSON, con los planes ya resueltos. Solo para pruebas y scripts. */
export const rawBogotaContent: BogotaContent = {
  ...raw,
  meta: { ...raw.meta, description: fillPricingTokens(raw.meta.description) },
  pricing: { ...raw.pricing, plans: resolvePlans(raw.pricing.plans) },
  faq: {
    ...raw.faq,
    items: raw.faq.items.map((item) => ({ ...item, answer: fillPricingTokens(item.answer) })),
  },
};

/**
 * Contenido listo para publicar: sin las preguntas con marcador `{{TODO}}`
 * (salvo en desarrollo o con NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS).
 */
export function getBogotaContent(): BogotaContent {
  const content = rawBogotaContent;
  return { ...content, faq: { ...content.faq, items: withoutTodos(content.faq.items) } };
}
