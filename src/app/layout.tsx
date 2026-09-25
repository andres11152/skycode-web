import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { LocaleProvider } from "@/components/LocaleProvider";
import { services } from "@/content/services";
import {
  contactEmail,
  contactPhone,
  ogImageUrl,
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
  whatsappHref,
} from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "optional",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "optional",
});


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s | ${siteName}`,
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
  alternates: {
    canonical: "/",
    languages: {
      es: `${siteUrl}/`,
      en: `${siteUrl}/en`,
      fr: `${siteUrl}/fr`,
      "x-default": `${siteUrl}/`,
    },
  },
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

function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "Organization"],
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    image: ogImageUrl,
    logo: `${siteUrl}/logo-mark.png`,
    description: siteDescription,
    email: contactEmail,
    telephone: contactPhone,
    address: {
      "@type": "PostalAddress",
      "addressCountry": "CO",
    },
    areaServed: ["CO", "MX", "CL", "PE", "EC", "PA", "AR", "UY", "US", "FR"],
    sameAs: [
      "https://facebook.com/skycodeagency/",
      "https://instagram.com/skycode.agency/",
    ],
    // Dos puntos de contacto declarados por separado, no uno con dos
    // canales: Schema.org modela cada canal como su propio ContactPoint.
    // El de WhatsApp existe para que el número quede asociado a la entidad
    // en el Knowledge Graph — NO hace que Google muestre un botón de
    // WhatsApp con ícono en los resultados: eso solo sale de un Google
    // Business Profile con acción de chat configurada, no del marcado del
    // sitio. No lo quites esperando ese efecto, ni lo agregues asumiéndolo.
    contactPoint: [
      {
        "@type": "ContactPoint",
        "telephone": contactPhone,
        "contactType": "customer service",
        "areaServed": ["CO", "MX", "CL", "PE", "EC", "PA", "AR", "UY", "US", "FR"],
        "availableLanguage": ["Spanish", "English", "French"],
      },
      {
        "@type": "ContactPoint",
        "telephone": contactPhone,
        "contactType": "sales",
        "url": whatsappHref,
        "availableLanguage": ["Spanish", "English", "French"],
      },
    ],
    makesOffer: services.map((service) => ({
      "@type": "Offer",
      url: `${siteUrl}/servicios/${service.slug}`,
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.description,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD no ejecuta JS, pero se escapa '<' para evitar el cierre prematuro del <script>
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * Declara explícitamente cuál es la navegación principal del sitio, en
 * orden de importancia. Es una señal para que Google entienda la jerarquía
 * al elegir los *sitelinks* (los enlaces secundarios bajo el resultado
 * principal).
 *
 * **Los sitelinks NO son configurables**: Google los elige por algoritmo y
 * retiró la herramienta para degradarlos de Search Console en 2016. Esto
 * NO los fuerza — solo refuerza qué páginas considerar. La señal que más
 * pesa de verdad es el enlazado interno real, no este marcado: hoy el
 * Navbar apunta a anclas de la home (`/#servicios`, `/#portfolio`) en vez
 * de a `/servicios` y `/portafolio`, así que esas páginas reciben muchos
 * menos enlaces internos que cada detalle de proyecto del portafolio — por
 * eso Google venía eligiendo proyectos como sitelinks.
 *
 * Se declara solo en español (rutas canónicas), igual que el JSON-LD de
 * Organization — no se triplica por locale, ver la nota de i18n en CLAUDE.md.
 */
function SiteNavigationJsonLd() {
  const navItems = [
    { name: "Servicios", url: `${siteUrl}/servicios` },
    { name: "Portafolio", url: `${siteUrl}/portafolio` },
    { name: "Blog Técnico", url: `${siteUrl}/blog` },
    { name: "Equipo", url: `${siteUrl}/equipo` },
    { name: "Contacto", url: `${siteUrl}/#contacto` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: navItems.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <OrganizationJsonLd />
        <SiteNavigationJsonLd />
        {googleAdsId && (
          <>
            {/* afterInteractive (no lazyOnload): la acción de conversión de
                Google Ads "Envío de formulario para clientes potenciales" es
                de tipo "Carga de página" sobre /gracias — el tag necesita
                estar cargado y haber corrido 'config' apenas esa página
                monta, sin depender de que el navegador quede idle (una
                página de agradecimiento suele tener muy poco dwell time). */}
            <Script
              id="google-ads-tag"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            />
            <Script id="google-ads-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
                if (window.location.pathname.indexOf('/gracias') !== -1) {
                  console.log('[GAds] gtag config ejecutado en', window.location.pathname, '- revisa la pestaña Network filtrando por "googleads" o "pagead" para confirmar el disparo de la conversión.');
                }
              `}
            </Script>
          </>
        )}

      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </LocaleProvider>
      </body>
    </html>
  );
}
