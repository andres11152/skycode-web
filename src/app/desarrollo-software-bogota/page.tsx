import type { Metadata } from "next";
import { BogotaPage } from "@/components/bogota/BogotaPage";
import { rawBogotaContent } from "@/content/bogota";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { localeOgLocale } from "@/lib/i18n";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";

// Estática con ISR: sin cookies()/headers(). Debe quedar literal en este archivo.
export const revalidate = 3600;

// Página local SOLO en español (la búsqueda "desarrollo de software en
// Bogotá" es en español): canonical propio y sin hreflang cruzado — no existe
// versión en inglés ni francés. Los títulos van SIN el sufijo de marca: el
// layout lo agrega con su plantilla.
const { title, description } = rawBogotaContent.meta;
const url = `${siteUrl}${bogotaPagePath}`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: bogotaPagePath },
  openGraph: {
    type: "website",
    locale: localeOgLocale.es,
    url,
    siteName,
    title,
    description,
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
  },
};

export default function DesarrolloSoftwareBogotaPage() {
  return <BogotaPage />;
}
