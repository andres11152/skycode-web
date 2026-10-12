import { SERVICES_SEGMENT, serviceSlugFor, type ServiceId } from "@/seo/slugs";
import { localeHomePath, type Locale } from "@/lib/i18n";

// Rutas de servicios: funciones PURAS (sin Next ni contenido) para que un componente cliente (Navbar,
// Footer, ServicesExplorer) construya un enlace sin arrastrar módulos de servidor. `serviceMetadata.ts`
// las re-exporta para los llamadores del lado servidor.
//
// El slug del detalle es nativo por idioma (`/en/services/legacy-software-migration`); el `id` interno
// del servicio (su slug en español) es lo que viaja por el resto del código. Ver src/seo/slugs.ts.

const prefixOf = (locale: Locale): string => {
  const homePath = localeHomePath(locale);
  return homePath === "/" ? "" : homePath;
};

/** Ruta absoluta (sin dominio) del índice de servicios para un locale dado. */
export function servicesIndexPath(locale: Locale): string {
  return `${prefixOf(locale)}/${SERVICES_SEGMENT[locale]}`;
}

/** Ruta absoluta (sin dominio) de la página de un servicio; `id` es el slug en español del catálogo. */
export function servicePath(locale: Locale, id: string): string {
  const slug = serviceSlugFor(id as ServiceId, locale);
  // Un id desconocido (no debería pasar: el catálogo y SERVICE_SLUGS los verifica un test) conserva el id.
  return `${servicesIndexPath(locale)}/${slug ?? id}`;
}
