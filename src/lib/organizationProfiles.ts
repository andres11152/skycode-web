import { socials } from "@/lib/site";
import { withoutTodos } from "@/lib/todoPlaceholders";

// Perfiles externos de la organización (`sameAs` del JSON-LD de
// Organization/ProfessionalService y de Person). Server-only a propósito: los
// marcadores {{TODO}} no deben viajar al bundle del navegador.
//
// Para completar un perfil, reemplaza el marcador por la URL real
// (`https://…`): mientras siga el marcador, el perfil se omite del JSON-LD en
// producción en vez de publicar un enlace roto.
const PENDING_PROFILES = [
  "{{TODO: URL de la página de LinkedIn de SkyCode Agency}}",
  "{{TODO: URL de la organización de GitHub de SkyCode Agency}}",
  "{{TODO: URL del Perfil de Negocio de Google de SkyCode Agency}}",
];

export const organizationSameAs: string[] = withoutTodos([socials.facebook, socials.instagram, ...PENDING_PROFILES]);

/** Centro de Bogotá (ciudad real de la sede, sin dirección de calle). */
export const bogotaGeo = { "@type": "GeoCoordinates", latitude: 4.711, longitude: -74.0721 } as const;
