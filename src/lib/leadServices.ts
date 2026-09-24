/**
 * Catálogo de "servicio solicitado" para leads — fuente única, puro (sin
 * `pg`, sin Phosphor), importable tanto desde el formulario público
 * ("use client") como desde `/api/contact` (server) y el dashboard.
 *
 * Los slugs son los mismos 8 que ya existen idénticos en los 3 idiomas en
 * `content/locales/{es,en,fr}/services.json` (ver src/content/services.ts)
 * — no se inventan valores nuevos, se reutiliza el catálogo real de
 * servicios de la agencia. `otro` cubre lo que no encaja en esas 8
 * categorías, con texto libre corto capturado aparte (`serviceOther`).
 *
 * La etiqueta que termina guardada en `leads.service` está SIEMPRE en
 * español, sin importar el idioma del visitante — el CRM es interno y en
 * español, y mezclar "Développement mobile" con "Aplicaciones Móviles"
 * para el mismo servicio rompería cualquier búsqueda/filtro por texto en
 * el dashboard (`l.service ILIKE`, ver lib/queries/leads.ts).
 */

export const LEAD_SERVICE_SLUGS = [
  "desarrollo-software-medida",
  "desarrollo-aplicaciones-moviles",
  "apis-integraciones",
  "frontend-alto-rendimiento",
  "ecommerce-tienda-online",
  "seguridad-cumplimiento",
  "arquitectura-documentacion",
  "migracion-datos-legacy",
  "inteligencia-artificial-aplicada",
  "otro",
] as const;

export type LeadServiceSlug = (typeof LEAD_SERVICE_SLUGS)[number];

export function isLeadServiceSlug(value: string): value is LeadServiceSlug {
  return (LEAD_SERVICE_SLUGS as readonly string[]).includes(value);
}

/** Etiqueta canónica en español por slug — misma redacción que los títulos
 * reales de `content/locales/es/services.json`, para que un lead capturado
 * desde el formulario diga exactamente lo mismo que la página del servicio. */
const LEAD_SERVICE_LABELS_ES: Record<Exclude<LeadServiceSlug, "otro">, string> = {
  "desarrollo-software-medida": "Sistemas y Plataformas a la Medida",
  "desarrollo-aplicaciones-moviles": "Aplicaciones Móviles (Android & iOS)",
  "apis-integraciones": "Integraciones & Conexión de Sistemas",
  "frontend-alto-rendimiento": "Páginas Web y Aplicaciones Ultra-Rápidas",
  "ecommerce-tienda-online": "Ecommerce · Tienda en Línea",
  "seguridad-cumplimiento": "Seguridad y Protección de Datos",
  "arquitectura-documentacion": "Documentación Clara y Transferencia Total",
  "migracion-datos-legacy": "Modernización y Rescate de Datos Antiguos",
  "inteligencia-artificial-aplicada": "Inteligencia Artificial con Propósito Real",
};

const MAX_SERVICE_OTHER_LENGTH = 120;

/**
 * Resuelve el `slug` (+ texto libre si es "otro") elegido en el formulario
 * a la etiqueta que se guarda en `leads.service`. Devuelve `null` cuando no
 * hay selección válida — nunca un default inventado (ver bug real que este
 * módulo corrige: `service` caía en literales fijos como "Contacto Web" o
 * "Desarrollo General" que no describían nada real).
 */
export function resolveLeadService(slug: string | null | undefined, otherText?: string | null): string | null {
  if (!slug || !isLeadServiceSlug(slug)) return null;

  if (slug === "otro") {
    const trimmed = (otherText ?? "").trim().slice(0, MAX_SERVICE_OTHER_LENGTH);
    return trimmed ? `Otro: ${trimmed}` : null;
  }

  return LEAD_SERVICE_LABELS_ES[slug];
}

/**
 * Contextos de origen aceptados para `leads.source`, reemplazando los
 * literales fijos que antes hardcodeaba cada endpoint ("Contacto Web",
 * "Formulario Directo") sin distinguir de dónde venía realmente el
 * visitante. Whitelist cerrada: nunca se confía un string libre del
 * cliente para una columna que alimenta reportes de atribución.
 */
export const LEAD_FORM_CONTEXTS = [
  "Formulario Web",
  "Landing Ads",
  "Cotizador",
  // Captura suave: solo dejó su correo desde el resumen del cotizador, sin
  // conversar ni llenar el formulario de contacto — el equipo debe saber
  // que este lead todavía no tiene nombre ni mensaje real, es más frío
  // que uno que sí completó "Cotizador".
  "Cotizador (solo email)",
] as const;
export type LeadFormContext = (typeof LEAD_FORM_CONTEXTS)[number];

export function isLeadFormContext(value: string): value is LeadFormContext {
  return (LEAD_FORM_CONTEXTS as readonly string[]).includes(value);
}

/**
 * Mapeo de los 5 tipos de proyecto del cotizador (`ProjectEstimator`,
 * `projectTypes[].id`) a un slug real del catálogo de servicios — para que
 * el tipo de proyecto que la persona ya eligió en el cotizador llegue como
 * `service` real al CRM en vez de perderse (bug real: el cotizador solo
 * escribía texto en el textarea del formulario de contacto, nunca mandaba
 * un `service` estructurado).
 */
export const ESTIMATOR_TYPE_TO_SERVICE_SLUG: Record<string, LeadServiceSlug> = {
  software: "desarrollo-software-medida",
  mobile: "desarrollo-aplicaciones-moviles",
  ai: "inteligencia-artificial-aplicada",
  apis: "apis-integraciones",
  web: "frontend-alto-rendimiento",
  ecommerce: "ecommerce-tienda-online",
};
