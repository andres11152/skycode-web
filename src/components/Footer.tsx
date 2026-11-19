"use client";

import { openCookiePreferences } from "@/lib/useConsent";
import { servicePath, servicesIndexPath } from "@/lib/servicePaths";
import { getCookieBannerContent } from "@/content/cookieBanner";
import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { Phone } from "@phosphor-icons/react";
import { MailIcon } from "@/components/icons/UiIcons";
import { CopyButton } from "@/components/ui/CopyButton";
import { Button } from "@/components/ui/Button";
import { useRecentArticles } from "@/lib/useRecentArticles";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { faqPath } from "@/lib/faqPaths";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { portfolioIndexPath } from "@/lib/portfolioPaths";
import { contactEmail, contactPhone, siteName, socials, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getFooterContent } from "@/content/footer";
import { getNavContent } from "@/content/nav";
import { useLocale } from "@/components/LocaleProvider";
import { localeHomePath, localeNames, locales, t, type Locale } from "@/lib/i18n";
import { switchLocalePath } from "@/lib/localePaths";
import { EsBadge } from "@/components/ui/EsBadge";
import { BrandPeriod } from "@/components/ui/BrandPeriod";

const FOUNDED_YEAR = 2023;

function FacebookIcon({ size = 16, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      {...props}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 16, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Facebook",
    href: socials.facebook,
    Icon: FacebookIcon,
    hoverClass: "hover:bg-[#1877F2]/10 hover:border-[#1877F2]/20 hover:text-[#1877F2]",
  },
  {
    label: "Instagram",
    href: socials.instagram,
    Icon: InstagramIcon,
    hoverClass: "hover:bg-[#E4405F]/10 hover:border-[#E4405F]/20 hover:text-[#E4405F]",
  },
];

// Las páginas legales siguen solo en español (ver CLAUDE.md) — el blog ya
// no, así que `recentPosts` se calcula dentro del componente con el
// locale real, no a nivel de módulo (ahí no hay locale todavía).
const legalLinks = [
  { label: "Política de Privacidad", href: "/politica-privacidad" },
  { label: "Política de Cookies", href: "/politica-cookies" },
  { label: "Términos de Uso", href: "/terminos-uso" },
  { label: "Términos y Condiciones", href: "/terminos-y-condiciones" },
];

// `max-sm:min-h-11`: en móvil cada enlace del pie es un objetivo táctil de 44 px (antes medían 20 px de alto).
const linkClasses =
  "rounded text-sm text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background max-sm:inline-flex max-sm:min-h-11 max-sm:items-center";

function ColumnHeading({ children, esOnly }: { children: string; esOnly?: boolean }) {
  return (
    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
      {children}
      <BrandPeriod />
      {esOnly && <EsBadge />}
    </h3>
  );
}

/**
 * Columna de enlaces del pie. En escritorio, encabezado + lista siempre visibles. En móvil es un
 * acordeón (la auditoría midió el pie en ~2,5 pantallas de enlaces): el encabezado es un botón de
 * 56 px y la lista sigue en el HTML aunque esté plegada (`max-sm:hidden`), así los rastreadores y
 * Ctrl+F la ven. Al abrirse entra con el mismo fundido que la FAQ (CSS, sin animar la altura).
 */
function FooterColumn({ heading, children }: { heading: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <nav aria-label={heading} className="max-sm:border-b max-sm:border-foreground/10">
      <div className="max-sm:hidden">
        <ColumnHeading>{heading}</ColumnHeading>
      </div>
      <h3 className="sm:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full items-center justify-between rounded text-left text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex items-center">
            {heading}
            <BrandPeriod />
          </span>
          <svg
            viewBox="0 0 16 16"
            width={16}
            height={16}
            aria-hidden="true"
            className={cn(
              "text-foreground/70 transition-transform duration-[250ms] ease-[var(--ease-out)] motion-reduce:transition-none",
              open && "rotate-180",
            )}
          >
            <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <ul
        id={listId}
        className={cn("mt-4 flex flex-col gap-3 max-sm:mt-0 max-sm:gap-0 max-sm:pb-3", open ? "max-sm:animate-faq-in" : "max-sm:hidden")}
      >
        {children}
      </ul>
    </nav>
  );
}

/** Enlaces a los servicios por idioma, calculados en el servidor (layout): el Footer viaja en todas las páginas y no debe importar `content/services` (los 9 servicios con descripciones en 3 idiomas, ~19 KB gzip de JS). */
export type FooterServiceLinks = Record<Locale, { slug: string; title: string }[]>;

export function Footer({ serviceLinks }: { serviceLinks: FooterServiceLinks }) {
  const currentYear = new Date().getFullYear();
  const locale = useLocale();
  const pathname = usePathname();
  const footerData = getFooterContent(locale);
  const navData = getNavContent(locale);
  const services = serviceLinks[locale];
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  // Ya vienen del más reciente al más antiguo (GET /api/articles/recent),
  // no hace falta reordenar acá.
  const footerRef = useRef<HTMLElement>(null);
  const recentPosts = useRecentArticles(locale, 4, footerRef);

  // Los documentos legales siguen solo en español (ver CLAUDE.md): sus enlaces
  // llevan el badge ES fuera de /. El resto de rutas ya tiene versión por idioma.
  const esOnly = locale !== "es";
  const exploreLinks = [
    { label: footerData.homeLabel, href: homePath, esOnly: false },
    { label: footerData.servicesHeading, href: servicesIndexPath(locale), esOnly: false },
    { label: navData.portafolio, href: portfolioIndexPath(locale), esOnly: false },
    { label: navData.cotizador, href: `${prefix}/cotizador`, esOnly: false },
    { label: navData.equipo, href: `${prefix}/equipo`, esOnly: false },
    { label: "Blog", href: blogIndexPath(locale), esOnly: false },
    { label: navData.faq, href: faqPath(locale), esOnly: false },
    // Página local solo en español (ver content/bogota.ts): fuera de /, lleva la insignia ES.
    { label: footerData.bogotaLink, href: bogotaPagePath, esOnly },
    { label: footerData.getInTouchHeading, href: `${prefix}/#contacto`, esOnly: false },
  ];

  // Todos los enlaces del pie van con `prefetch={false}`: el pie está en cada
  // página y ~25 enlaces al entrar en pantalla disparaban decenas de peticiones
  // RSC (cada una con la página completa). Al pasar el cursor sí se precarga.
  return (
    <footer ref={footerRef} className="border-t border-foreground/10">
      <div className="grid lg:grid-cols-[1fr_380px]">
        <div className="px-6 py-16 sm:px-10">
          <div className="mx-auto grid max-w-5xl gap-0 sm:grid-cols-[auto_1fr_1fr_1fr] sm:gap-8">
            <Link
              prefetch={false}
              href={homePath}
              aria-label={footerData.logoAria}
              className="flex h-14 items-start outline-none transition-transform duration-300 ease-out hover:scale-105 max-sm:mb-6 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            >
              <ThemedLogo
                variant="full"
                alt="SkyCode Agency"
                width={260}
                height={170}
                className="h-14 w-auto"
              />
            </Link>

            <FooterColumn heading={footerData.exploreHeading}>
                {exploreLinks.map((link) => (
                  <li key={link.href}>
                    <Link prefetch={false} href={link.href} className={cn(linkClasses, "inline-flex items-center gap-1.5")}>
                      {link.label}
                      {link.esOnly && <EsBadge />}
                    </Link>
                  </li>
                ))}
            </FooterColumn>

            <FooterColumn heading={footerData.servicesHeading}>
                {services.map((service) => (
                  <li key={service.slug}>
                    <Link
                      prefetch={false}
                      href={servicePath(locale, service.slug)}
                      className={linkClasses}
                    >
                      {service.title}
                    </Link>
                  </li>
                ))}
            </FooterColumn>

            <FooterColumn heading={footerData.resourcesHeading}>
                <li>
                  <Link prefetch={false} href={blogIndexPath(locale)} className={linkClasses}>
                    {footerData.allArticles}
                  </Link>
                </li>
                {recentPosts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      prefetch={false}
                      href={blogPostPath(locale, post.slug)}
                      className={cn(linkClasses, "line-clamp-1")}
                      title={post.title}
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
            </FooterColumn>
          </div>

          <div className="mx-auto mt-16 flex max-w-5xl flex-col gap-5 border-t border-foreground/10 pt-6 text-xs text-foreground/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {siteName} © {FOUNDED_YEAR}–{currentYear}. {footerData.rightsReserved}
              </p>
              {/* Enlaces <a href> reales a esta misma página en los otros idiomas: el selector del Navbar solo los pinta al abrirse y un rastreador no los veía. */}
              <nav aria-label={footerData.languagesLabel}>
                <ul className="flex w-fit items-center gap-1 rounded-full border border-foreground/10 p-1">
                  {locales.map((target) => (
                    <li key={target}>
                      {target === locale ? (
                        <span
                          aria-current="true"
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-foreground px-3 font-mono text-[11px] font-semibold tracking-wide text-background uppercase sm:min-h-8 sm:min-w-9"
                        >
                          {target}
                        </span>
                      ) : (
                        <Link
                          prefetch={false}
                          href={switchLocalePath(pathname, target)}
                          hrefLang={target}
                          lang={target}
                          aria-label={localeNames[target]}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide text-foreground/70 uppercase outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-8 sm:min-w-9"
                        >
                          {target}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-foreground/10 pt-5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link prefetch={false} href={link.href} className={cn(linkClasses, "inline-flex items-center gap-1.5")}>
                    {link.label}
                    {esOnly && <EsBadge />}
                  </Link>
                </li>
              ))}
              <li>
                {/* Reabre el centro de preferencias (CookieBanner escucha el evento). */}
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className={cn(linkClasses, "min-h-11 text-xs sm:min-h-0")}
                >
                  {getCookieBannerContent(locale).footerLink}
                </button>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/login"
                  className={cn(linkClasses, "text-foreground/60 hover:text-accent transition-colors")}
                >
                  Acceso a Plataforma
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-foreground/10 bg-foreground/[0.03] px-6 py-16 sm:px-10 lg:border-t-0 lg:border-l">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            {footerData.getInTouchHeading}
            <BrandPeriod />
          </h3>
          <p className="mt-2 max-w-xs text-sm text-foreground/80">
            {footerData.getInTouchDescription}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={`${prefix}/#contacto`} variant="secondary" size="md">
              {footerData.getInTouchCtaPrimary}
            </Button>
            <Button href={whatsappHref} variant="accent" size="md">
              {footerData.getInTouchCtaSecondary}
            </Button>
          </div>

          {/* Dato + botón de copiar: copiar un correo/teléfono para pegarlo en
              otra app es más común que tocarlo (en escritorio, `mailto:`/`tel:`
              abre una app que muchas veces no está configurada). */}
          <ul className="mt-4 flex flex-col">
            {[
              { Icon: MailIcon, href: `mailto:${contactEmail}`, value: contactEmail },
              { Icon: Phone, href: `tel:${contactPhone}`, value: contactPhone },
            ].map(({ Icon, href, value }) => (
              <li key={value} className="flex items-center gap-1">
                <a
                  href={href}
                  className="inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-foreground outline-none transition-colors hover:text-accent-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Icon size={16} aria-hidden="true" />
                  {value}
                </a>
                <CopyButton
                  value={value}
                  label={t(footerData.copyLabel, { value })}
                  copiedLabel={footerData.copiedLabel}
                />
              </li>
            ))}
          </ul>

          <h3 className="mt-10 text-sm font-semibold text-foreground">
            {footerData.followHeading}
            <BrandPeriod />
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {socialLinks.map(({ label, href, Icon, hoverClass }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/10 px-4 py-2.5 text-sm text-foreground/80 outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    hoverClass
                  )}
                >
                  <Icon size={16} />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
