import siteConfig from "@/content/locales/es/site.json";
import siteConfigEn from "@/content/locales/en/site.json";
import siteConfigFr from "@/content/locales/fr/site.json";
import type { Locale } from "@/lib/i18n";
import { getPageSeo } from "@/seo/keyword-map";

const siteByLocale = { es: siteConfig, en: siteConfigEn, fr: siteConfigFr };

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://skycode.agency"
).replace(/\/$/, "");
export const siteName = siteConfig.siteName;
export const siteTagline = siteConfig.siteTagline;
export const siteDescription = siteConfig.siteDescription;
export const ogImageUrl = `${siteUrl}/og-image.png`;
export const contactEmail = siteConfig.contactEmail;
export const contactPhone = siteConfig.contactPhone;
export const socials = siteConfig.socials;
export const whatsappHref = `https://wa.me/${contactPhone.replace("+", "")}`;

/**
 * Sufijo que el layout raíz agrega a cada `<title>` (`title.template`). Va
 * corto a propósito (10 caracteres): deja 50 para el título propio de cada
 * página sin pasar el límite de 60 que recorta Google. Si se cambia, ajusta
 * también los títulos (los verifican serviceSeo.test.ts y faq.test.ts).
 */
export const titleSuffix = " | SkyCode";
export const TITLE_MAX_LENGTH = 60;

/**
 * Tagline/descripción de sitio localizados — el resto de campos de site.json no varían por idioma.
 * El título y la descripción de la home salen del mapa de keywords (clúster `brand`): ahí es
 * donde se decide qué búsqueda es dueña de la home, y esas dos cadenas ya no viven en site.json.
 * `homeTitle` es ABSOLUTO (lleva la marca primero), por eso no se le agrega `titleSuffix`.
 */
export function getSiteText(locale: Locale) {
  const data = siteByLocale[locale];
  const brand = getPageSeo("brand", locale);
  return {
    siteTagline: data.siteTagline,
    siteDescription: data.siteDescription,
    homeTitle: brand.title,
    homeDescription: brand.description,
  };
}
