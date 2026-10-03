/**
 * Inventario único de TODO lo que este sitio guarda en el navegador.
 *
 * Es la fuente de verdad de tres cosas que antes se escribían a mano y se
 * desfasaban: la tabla de la Política de Cookies, el detalle por categoría del
 * centro de preferencias y el test `cookieInventory.test.ts`, que recorre
 * `src/` y falla si aparece una clave de almacenamiento que no esté acá.
 * Agregar un `localStorage.setItem` sin declararlo rompe el CI a propósito.
 *
 * Módulo puro (sin `pg`, sin DOM): lo importan componentes cliente y server.
 */

export type ConsentCategory = "necessary" | "preferences" | "measurement";

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  "necessary",
  "preferences",
  "measurement",
];

export type StorageKind = "cookie" | "localStorage" | "sessionStorage";

export interface StorageEntry {
  /** Nombre exacto de la clave o cookie, tal como aparece en el navegador. */
  name: string;
  kind: StorageKind;
  category: ConsentCategory;
  purpose: string;
  /** Texto legible: "Sesión del navegador", "24 horas", "Hasta que la borre"… */
  duration: string;
  /** `false` si la escribe un tercero (hoy solo el iframe de pago de Bold). */
  firstParty: boolean;
}

export const STORAGE_INVENTORY: readonly StorageEntry[] = [
  {
    name: "skycode_session",
    kind: "cookie",
    category: "necessary",
    purpose:
      "Mantiene la sesión iniciada en el portal de clientes o el panel interno. Solo existe si usted inicia sesión; en producción se llama __Host-skycode_session.",
    duration: "Hasta 7 días (se cierra antes tras 12 horas sin actividad)",
    firstParty: true,
  },
  {
    name: "skycode-consent",
    kind: "localStorage",
    category: "necessary",
    purpose:
      "Recuerda qué categorías de cookies aceptó o rechazó, para no volver a preguntarle y poder demostrar su elección.",
    duration: "Hasta que la borre o cambie la versión de la política",
    firstParty: true,
  },
  {
    name: "skycode-pending-contact-prefill",
    kind: "sessionStorage",
    category: "necessary",
    purpose:
      "Lleva lo que configuró en el cotizador hasta el formulario de contacto cuando cambia de página. Se borra al usarse.",
    duration: "Hasta cerrar la pestaña",
    firstParty: true,
  },
  {
    name: "skycode-geo-country",
    kind: "cookie",
    category: "preferences",
    purpose:
      "Guarda el país detectado para proponerle moneda e indicativo telefónico por defecto sin consultarlo en cada visita.",
    duration: "24 horas",
    firstParty: true,
  },
  {
    name: "skycode-attribution",
    kind: "localStorage",
    category: "measurement",
    purpose:
      "Guarda de qué campaña o página llegó (parámetros UTM, identificadores de clic de anuncios y referente) para adjuntarlo a su mensaje si nos escribe, y así saber qué canal funciona.",
    duration: "Hasta que la borre",
    firstParty: true,
  },
];

/** Claves de terceros: no las escribimos nosotros, pero se declaran en la política. */
export const THIRD_PARTY_STORAGE_NOTE = {
  provider: "Bold",
  category: "necessary" as ConsentCategory,
  purpose:
    "Solo si paga una factura desde el portal de clientes: el formulario de pago de Bold, que se abre en un marco propio, puede guardar sus propias cookies técnicas y antifraude. Nosotros no las controlamos ni las leemos.",
} as const;

export function entriesByCategory(category: ConsentCategory): StorageEntry[] {
  return STORAGE_INVENTORY.filter((entry) => entry.category === category);
}

export function storageKindLabel(kind: StorageKind): string {
  switch (kind) {
    case "cookie":
      return "Cookie";
    case "localStorage":
      return "Almacenamiento local";
    case "sessionStorage":
      return "Almacenamiento de sesión";
  }
}
