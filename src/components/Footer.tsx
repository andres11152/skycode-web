"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { getServicesContent } from "@/content/services";
import { useRecentArticles } from "@/lib/useRecentArticles";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { contactPhone, siteName, socials, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getFooterContent } from "@/content/footer";
import { getNavContent } from "@/content/nav";
import { useLocale } from "@/components/LocaleProvider";
import { localeHomePath } from "@/lib/i18n";
import { EsBadge } from "@/components/ui/EsBadge";

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

const linkClasses =
  "rounded text-sm text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ColumnHeading({ children, esOnly }: { children: string; esOnly?: boolean }) {
  return (
    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
      {children}
      <span className="text-accent-secondary">.</span>
      {esOnly && <EsBadge />}
    </h3>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const locale = useLocale();
  const footerData = getFooterContent(locale);
  const navData = getNavContent(locale);
  const { services } = getServicesContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  // Ya vienen del más reciente al más antiguo (GET /api/articles/recent),
  // no hace falta reordenar acá.
  const footerRef = useRef<HTMLElement>(null);
  const recentPosts = useRecentArticles(locale, 4, footerRef);

  // Portfolio sigue sin traducir (a diferencia del blog) — es la única
  // ruta que queda esOnly acá.
  const esOnly = locale !== "es";
  const exploreLinks = [
    { label: footerData.homeLabel, href: homePath, esOnly: false },
    { label: footerData.servicesHeading, href: `${prefix}/servicios`, esOnly: false },
    { label: "Portfolio", href: "/portafolio", esOnly },
    { label: navData.equipo, href: `${prefix}/equipo`, esOnly: false },
    { label: "Blog", href: blogIndexPath(locale), esOnly: false },
    { label: footerData.getInTouchHeading, href: `${prefix}/#contacto`, esOnly: false },
  ];

  return (
    <footer ref={footerRef} className="border-t border-foreground/10">
      <div className="grid lg:grid-cols-[1fr_380px]">
        <div className="px-6 py-16 sm:px-10">
          <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-[auto_1fr_1fr_1fr] sm:gap-8">
            <Link
              href={homePath}
              aria-label={footerData.logoAria}
              className="flex h-14 items-start outline-none transition-transform duration-300 ease-out hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            >
              <Image
                src="/logo-full.png"
                alt="SkyCode Agency"
                width={260}
                height={170}
                className="h-14 w-auto"
              />
            </Link>

            <nav aria-label={footerData.exploreHeading}>
              <ColumnHeading>{footerData.exploreHeading}</ColumnHeading>
              <ul className="mt-4 flex flex-col gap-3">
                {exploreLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={cn(linkClasses, "inline-flex items-center gap-1.5")}>
                      {link.label}
                      {link.esOnly && <EsBadge />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={footerData.servicesHeading}>
              <ColumnHeading>{footerData.servicesHeading}</ColumnHeading>
              <ul className="mt-4 flex flex-col gap-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <Link
                      href={`${prefix}/servicios/${service.slug}`}
                      className={linkClasses}
                    >
                      {service.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={footerData.resourcesHeading}>
              <ColumnHeading>{footerData.resourcesHeading}</ColumnHeading>
              <ul className="mt-4 flex flex-col gap-3">
                <li>
                  <Link href={blogIndexPath(locale)} className={linkClasses}>
                    {footerData.allArticles}
                  </Link>
                </li>
                {recentPosts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={blogPostPath(locale, post.slug)}
                      className={cn(linkClasses, "line-clamp-1")}
                      title={post.title}
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mx-auto mt-16 flex max-w-5xl flex-col gap-4 border-t border-foreground/10 pt-6 text-xs text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {siteName} © {FOUNDED_YEAR}–{currentYear}. {footerData.rightsReserved}
            </p>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={cn(linkClasses, "inline-flex items-center gap-1.5")}>
                    {link.label}
                    {esOnly && <EsBadge />}
                  </Link>
                </li>
              ))}
              <li>
                <Link
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
            <span className="text-accent-secondary">.</span>
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

          <a
            href={`tel:${contactPhone}`}
            className="mt-5 inline-flex items-center gap-2 rounded text-sm font-medium text-foreground outline-none transition-colors hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Phone size={16} />
            {contactPhone}
          </a>

          <h3 className="mt-10 text-sm font-semibold text-foreground">
            {footerData.followHeading}
            <span className="text-accent-secondary">.</span>
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {socialLinks.map(({ label, href, Icon, hoverClass }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/10 px-4 py-2.5 text-sm text-foreground/80 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
