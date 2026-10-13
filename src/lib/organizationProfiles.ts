import { socials } from "@/lib/site";
import { withoutTodos } from "@/lib/todoPlaceholders";

// Perfiles externos y datos de entidad de la organización (`sameAs`, `founder`, `foundingDate`… del
// JSON-LD de Organization/ProfessionalService). Server-only a propósito: los marcadores {{TODO}} no
// deben viajar al bundle del navegador.
//
// Para completar un dato, reemplaza el marcador por el valor real: mientras siga el marcador, el
// perfil o campo se OMITE del JSON-LD en producción en vez de publicar un enlace roto o un dato
// inventado (`npm run seo:todos` los lista).
const PENDING_PROFILES = [
  "{{TODO: URL de la página de LinkedIn de SkyCode Agency}}",
  "{{TODO: URL de la organización de GitHub de SkyCode Agency}}",
  "{{TODO: URL del perfil de SkyCode Agency en Clutch}}",
  "{{TODO: URL del Perfil de Negocio de Google de SkyCode Agency}}",
];

export const organizationSameAs: string[] = withoutTodos([socials.facebook, socials.instagram, ...PENDING_PROFILES]);

/**
 * `legalName` del schema: el NOMBRE COMERCIAL. SkyCode Agency es el nombre comercial de una persona natural inscrita en
 * el RUT (sin razón social) y no existe un campo de configuración que apruebe publicar el nombre civil del titular en
 * el schema, así que no se expone. Si se constituye una sociedad, aquí va su razón social.
 */
export const ORGANIZATION_LEGAL_NAME = "SkyCode Agency";

/** Nombres con los que la gente busca la marca (variantes con y sin espacio) — alimenta el SERP de marca. */
export const ORGANIZATION_ALTERNATE_NAMES = ["SkyCode", "Sky Code", "SkyCode Agency"] as const;

/** Fundador: `slug` del perfil público en /equipo, nombre tal como se publica ahí. */
export const ORGANIZATION_FOUNDER = { slug: "andres-betancourt", name: "Andrés Betancourt", jobTitle: "Backend & Arquitectura" } as const;

/** Fecha de fundación (`YYYY` o `YYYY-MM-DD`). Dato del negocio que el repo no trae: no se inventa. */
export const ORGANIZATION_FOUNDING_DATE: string = "{{TODO: año o fecha de fundación de SkyCode, en formato YYYY o YYYY-MM-DD}}";

/** Centro de Bogotá (ciudad real de la sede, sin dirección de calle). */
export const bogotaGeo = { "@type": "GeoCoordinates", latitude: 4.711, longitude: -74.0721 } as const;
