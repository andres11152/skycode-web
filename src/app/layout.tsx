import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SkipLink } from "@/components/SkipLink";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import { MouseGlow } from "@/components/ui/MouseGlow";
import { CookieBanner } from "@/components/CookieBanner";
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
  weight: ["500", "600", "700"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
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

const BROWSER_LOCALE_REDIRECT_SCRIPT = `
(function () {
  try {
    if (window.location.pathname !== "/") return;
    var KEY = "skycode-locale-redirect-done";
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, "1");

    var savedLocale = localStorage.getItem("skycode-locale");
    if (savedLocale) {
      if (savedLocale !== "es") {
        window.location.replace("/" + savedLocale);
      }
      return;
    }

    var supported = ["en", "fr"];
    var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (var i = 0; i < langs.length; i++) {
      var code = (langs[i] || "").slice(0, 2).toLowerCase();
      if (code === "es") {
        return;
      }
      if (supported.indexOf(code) !== -1) {
        window.location.replace("/" + code);
        return;
      }
    }
  } catch (e) {}
})();
`;

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
        <OrganizationJsonLd />
        <script dangerouslySetInnerHTML={{ __html: BROWSER_LOCALE_REDIRECT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          <SkipLink />
          <Navbar />
          {children}
          <Footer />
          <HtmlLangSync />
          <CookieBanner />
        </LocaleProvider>
      </body>
    </html>
  );
}
