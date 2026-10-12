import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { LazyMotionProvider } from "@/components/LazyMotionProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ThemeSync } from "@/components/ThemeSync";
import { getServicesContent } from "@/content/services";
import { locales, type Locale } from "@/lib/i18n";
import type { FooterServiceLinks } from "@/components/Footer";
import { ogImageUrl, siteDescription, getSiteText, siteName, siteTagline, siteUrl, titleSuffix } from "@/lib/site";
import { buildSiteGraph, serializeJsonLd } from "@/lib/jsonLd";
import { ENABLE_DARK_MODE, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const { homeTitle } = getSiteText("es");

// Títulos de servicio por idioma para el Footer (cliente): se calculan aquí, en el servidor.
const SERVICE_LINKS = Object.fromEntries(
  locales.map((locale: Locale) => [locale, getServicesContent(locale).services.map(({ slug, title }) => ({ slug, title }))])
) as FooterServiceLinks;

// Una sola familia (Geist) para titulares y texto, y su monoespaciada para etiquetas,
// numeración y código. Las dos tipografías anteriores (Space Grotesk + Plus Jakarta Sans)
// son las elecciones por defecto de las plantillas generadas; una familia sobria con
// jerarquía por peso y tamaño se lee como producto de ingeniería. `swap` con el ajuste
// automático de métricas de next/font evita el salto de layout al cargar.
const geist = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});


// Color de la barra del navegador móvil según el esquema del sistema. Solo con el modo
// oscuro encendido: apagado, no se declara nada (comportamiento actual).
export const viewport: Viewport = ENABLE_DARK_MODE
  ? {
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
      ],
    }
  : {};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    // Solo lo usa una página que no declare título (p. ej. not-found). Es el título brand-first de
    // la home, que va sin sufijo.
    default: homeTitle,
    template: `%s${titleSuffix}`,
  },
  description: siteDescription,
  keywords: [
    "desarrollo de software a la medida",
    "fábrica de software",
    "consultoría de software",
    "desarrollo backend a la medida",
    "desarrollo frontend Next.js",
    "arquitectura de software robusta",
    "APIs REST e integraciones",
    "seguridad OWASP",
    "cumplimiento de protección de datos",
    "outsourcing de desarrollo de software",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  // Sin `alternates` a propósito: el canonical y el hreflang los define CADA
  // página. Un `canonical: "/"` aquí se heredaba en cualquier página cuya
  // `generateMetadata` devolviera `{}` o fallara, y Google lo leía como
  // "esta URL es un duplicado de la home" (bug real en producción).
  // Códigos de verificación de propiedad de Search Console/Bing Webmaster
  // Tools, vía meta tag en vez de subir el archivo HTML que ofrecen como
  // alternativa — así no hay que tocar `public/` cada vez que se rota o se
  // agrega un motor de búsqueda nuevo. Sin las variables configuradas,
  // Next.js simplemente no renderiza el tag correspondiente (no hace falta
  // desactivarlo a mano) — ver .env.example para dónde obtenerlos.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_419",
    alternateLocale: ["en_US", "fr_FR"],
    url: siteUrl,
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${siteName} — ${siteTagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [ogImageUrl],
  },
};

/**
 * Entidades del sitio (organización, sitio web, navegación) en UN solo `@graph` con `@id` estables:
 * el resto de las páginas las referencian por `@id` en vez de redefinirlas. Ver lib/jsonLd.ts.
 */
function SiteJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildSiteGraph()) }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
      // `data-dark-ready` habilita el CSS oscuro de theme.css (ver lib/theme.ts); apagado, no hay atributo.
      data-dark-ready={ENABLE_DARK_MODE ? "" : undefined}
      // El script del <head> fija `data-theme` antes de hidratar: sin esto React avisa de un
      // desajuste de atributos en <html>. Solo afecta a este elemento, no a sus hijos.
      suppressHydrationWarning
    >
      <head>
        {ENABLE_DARK_MODE ? (
          // Bloqueante a propósito: debe correr ANTES de pintar para evitar el destello de tema.
          // Texto fijo y mínimo autorizado por hash en la CSP estricta (lib/csp.ts).
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        ) : null}
        <SiteJsonLd />
      </head>
      <body className="min-h-full flex flex-col">
        <LazyMotionProvider>
          <LocaleProvider>
            {/* Fuera de ConditionalLayout: ahí el panel/login hacen `return` anticipado y no lo montarían. */}
            <ThemeSync />
            <ConditionalLayout serviceLinks={SERVICE_LINKS}>{children}</ConditionalLayout>
          </LocaleProvider>
        </LazyMotionProvider>
      </body>
    </html>
  );
}
