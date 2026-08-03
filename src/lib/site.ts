import siteConfig from "@/content/locales/es/site.json";
import siteConfigEn from "@/content/locales/en/site.json";
import siteConfigFr from "@/content/locales/fr/site.json";
import type { Locale } from "@/lib/i18n";

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

/** Tagline/descripción localizadas — el resto de campos de site.json no varían por idioma. */
export function getSiteText(locale: Locale) {
  const data = siteByLocale[locale];
  return { siteTagline: data.siteTagline, siteDescription: data.siteDescription };
}
