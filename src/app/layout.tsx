import type { Metadata } from "next";
import Script from "next/script";
import { Geist_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
  preload: false,
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
    contactPoint: {
      "@type": "ContactPoint",
      "telephone": contactPhone,
      "contactType": "customer service",
      "areaServed": ["CO", "MX", "CL", "PE", "EC", "PA", "AR", "UY", "US", "FR"],
      "availableLanguage": ["Spanish", "English", "French"]
    },
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

const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" as="image" href="/logo-mark.png" fetchPriority="high" />
        <OrganizationJsonLd />
        {googleAdsId && (
          <>
            <Script
              id="google-ads-tag"
              strategy="lazyOnload"
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            />
            <Script id="google-ads-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
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
