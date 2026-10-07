import bogotaDataEs from "./locales/es/bogota.json";
import { withoutTodos } from "@/lib/todoPlaceholders";

// Página local `/desarrollo-software-bogota` — SOLO en español, a propósito:
// la búsqueda local ("desarrollo de software en Bogotá") es en español, así
// que no hay `bogota.json` en en/fr ni hreflang cruzado (mismo criterio que
// los documentos legales). Desde la home en /en y /fr se enlaza a la misma
// página con la insignia ES.
//
// Todo el copy vive en `locales/es/bogota.json`; este módulo solo lo tipa y,
// sobre todo, aplica la regla de los marcadores `{{TODO: …}}` (ver
// lib/todoPlaceholders.ts): precios y tiempos son datos de negocio que no se
// pueden inventar, así que cada fila/pregunta que contiene un marcador se
// omite en producción. Por eso un marcador ocupa SIEMPRE su propio elemento.

export interface BogotaFact {
  label: string;
  text: string;
}

export interface BogotaPillar {
  title: string;
  text: string;
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

export interface BogotaRow {
  label: string;
  value: string;
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
    factsLabel: string;
    facts: BogotaFact[];
  };
  tocLabel: string;
  about: { id: string; tocLabel: string; heading: string; paragraphs: string[]; pillars: BogotaPillar[] };
  services: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    items: BogotaServiceItem[];
    allLabel: string;
  };
  cases: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    caseLabel: string;
    items: BogotaCaseItem[];
    allLabel: string;
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
  };
  pricing: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    factorsHeading: string;
    factors: string[];
    rangesHeading: string;
    rows: BogotaRow[];
    paymentNote: string;
    estimatorText: string;
  };
  timelines: {
    id: string;
    tocLabel: string;
    heading: string;
    intro: string;
    rangesHeading: string;
    rows: BogotaRow[];
    note: string;
  };
  faq: { id: string; tocLabel: string; heading: string; items: BogotaFaqItem[] };
  cta: { heading: string; body: string; primary: string; secondary: string };
}

/** Contenido tal cual está en el JSON (con marcadores). Solo para pruebas y scripts. */
export const rawBogotaContent: BogotaContent = bogotaDataEs;

/**
 * Contenido listo para publicar: sin las filas/preguntas con marcador
 * `{{TODO}}` (salvo en desarrollo o con NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS).
 * Los marcadores solo pueden vivir en `pricing.rows`, `timelines.rows` y
 * `faq.items` — `bogota.test.ts` falla si aparece uno en otro lugar.
 */
export function getBogotaContent(): BogotaContent {
  const raw = rawBogotaContent;
  return {
    ...raw,
    pricing: { ...raw.pricing, rows: withoutTodos(raw.pricing.rows) },
    timelines: { ...raw.timelines, rows: withoutTodos(raw.timelines.rows) },
    faq: { ...raw.faq, items: withoutTodos(raw.faq.items) },
  };
}
