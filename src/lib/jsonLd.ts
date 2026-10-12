import { getServicesContent } from "@/content/services";
import { contactEmail, contactPhone, ogImageUrl, siteDescription, siteName, siteUrl, whatsappHref } from "@/lib/site";
import { authorUrl } from "@/lib/blogPaths";
import { servicePath } from "@/lib/serviceMetadata";
import {
  ORGANIZATION_ALTERNATE_NAMES,
  ORGANIZATION_FOUNDER,
  ORGANIZATION_FOUNDING_DATE,
  ORGANIZATION_LEGAL_NAME,
  bogotaGeo,
  organizationSameAs,
} from "@/lib/organizationProfiles";
import { textOrNull } from "@/lib/todoPlaceholders";

// Entidades schema.org del sitio, con `@id` ESTABLES que el resto de las páginas referencian
// (Service, BlogPosting, Person, WebPage…) en vez de redefinir a la organización cada vez:
//   - `#organization`  la agencia (ProfessionalService + Organization)
//   - `#website`       el sitio (nombre de sitio para el SERP; `publisher` → #organization)
// El layout raíz emite ambas en UN solo `@graph`; las páginas las citan con `organizationRef()` /
// `websiteRef()`, que además llevan `name` para que un consumidor que no una `<script>`s distintos
// (p. ej. el validador de resultados enriquecidos) siga leyendo un publisher/provider completo.
//
// Server-only: lee marcadores {{TODO}} (`organizationProfiles.ts`) y el catálogo de servicios.

export const ORGANIZATION_ID = `${siteUrl}/#organization`;
export const WEBSITE_ID = `${siteUrl}/#website`;
export const SITE_NAVIGATION_ID = `${siteUrl}/#site-navigation`;

/** Nombre del sitio en el SERP (`WebSite.name`): la marca corta, la misma del sufijo de los títulos. */
export const WEBSITE_NAME = "SkyCode";

export const SERVICE_AREAS = ["CO", "MX", "CL", "PE", "EC", "PA", "AR", "UY", "US", "FR"] as const;

export type JsonLdNode = Record<string, unknown>;

export const organizationRef = (): JsonLdNode => ({ "@type": "Organization", "@id": ORGANIZATION_ID, name: siteName });
export const websiteRef = (): JsonLdNode => ({ "@type": "WebSite", "@id": WEBSITE_ID, name: WEBSITE_NAME, url: siteUrl });

/** `@id` de la entidad Service de la página de detalle de un servicio (`<url>#service`). */
export function serviceNodeId(locale: Parameters<typeof servicePath>[0], slug: string): string {
  return `${siteUrl}${servicePath(locale, slug)}#service`;
}

/** Serializa para un `<script type="application/ld+json">` (escapa `<` para no cerrar el script). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildOrganizationNode(): JsonLdNode {
  const foundingDate = textOrNull(ORGANIZATION_FOUNDING_DATE);
  const founderUrl = authorUrl("es", ORGANIZATION_FOUNDER.slug);
  const services = getServicesContent("es").services;

  return {
    "@type": ["ProfessionalService", "Organization"],
    "@id": ORGANIZATION_ID,
    name: siteName,
    legalName: ORGANIZATION_LEGAL_NAME,
    alternateName: [...ORGANIZATION_ALTERNATE_NAMES],
    url: siteUrl,
    image: ogImageUrl,
    logo: `${siteUrl}/logo-mark.png`,
    description: siteDescription,
    email: contactEmail,
    telephone: contactPhone,
    ...(foundingDate ? { foundingDate } : {}),
    founder: { "@type": "Person", "@id": founderUrl, name: ORGANIZATION_FOUNDER.name, url: founderUrl, jobTitle: ORGANIZATION_FOUNDER.jobTitle },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bogotá",
      addressRegion: "Bogotá D.C.",
      addressCountry: "CO",
    },
    geo: bogotaGeo,
    areaServed: [...SERVICE_AREAS],
    sameAs: organizationSameAs,
    // Dos puntos de contacto declarados por separado, no uno con dos canales: Schema.org modela cada
    // canal como su propio ContactPoint. El de WhatsApp existe para que el número quede asociado a la
    // entidad en el Knowledge Graph — NO hace que Google muestre un botón de WhatsApp en los
    // resultados: eso solo sale de un Perfil de Negocio de Google con chat configurado.
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: contactPhone,
        contactType: "customer service",
        areaServed: [...SERVICE_AREAS],
        availableLanguage: ["Spanish", "English", "French"],
      },
      {
        "@type": "ContactPoint",
        telephone: contactPhone,
        contactType: "sales",
        url: whatsappHref,
        availableLanguage: ["Spanish", "English", "French"],
      },
    ],
    // Cada oferta apunta a la entidad Service de su página (mismo `@id`), no a una copia del texto.
    makesOffer: services.map((service) => ({
      "@type": "Offer",
      url: `${siteUrl}${servicePath("es", service.slug)}`,
      itemOffered: { "@type": "Service", "@id": serviceNodeId("es", service.slug), name: service.title },
    })),
  };
}

export function buildWebSiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteUrl,
    name: WEBSITE_NAME,
    alternateName: ["SkyCode Agency", "Sky Code"],
    description: siteDescription,
    inLanguage: ["es", "en", "fr"],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * Navegación principal declarada en orden de importancia (señal para los *sitelinks*, que Google
 * elige por algoritmo y no se pueden configurar: lo que más pesa es el enlazado interno real).
 * Solo en español (rutas canónicas), como el resto de las entidades del sitio.
 */
export function buildSiteNavigationNode(): JsonLdNode {
  const navItems = [
    { name: "Servicios", url: `${siteUrl}/servicios` },
    { name: "Portafolio", url: `${siteUrl}/portafolio` },
    { name: "Blog Técnico", url: `${siteUrl}/blog` },
    { name: "Equipo", url: `${siteUrl}/equipo` },
    { name: "Preguntas Frecuentes", url: `${siteUrl}/preguntas-frecuentes` },
    { name: "Contacto", url: `${siteUrl}/#contacto` },
  ];
  return {
    "@type": "ItemList",
    "@id": SITE_NAVIGATION_ID,
    itemListElement: navItems.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

/** El `@graph` único del sitio (se emite una vez, en el layout raíz). */
export function buildSiteGraph(): { "@context": "https://schema.org"; "@graph": JsonLdNode[] } {
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationNode(), buildWebSiteNode(), buildSiteNavigationNode()],
  };
}
