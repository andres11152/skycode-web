"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { servicesIndexPath } from "@/lib/servicePaths";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  m as motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type Variants,
} from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { EsBadge } from "@/components/ui/EsBadge";
import { getNavContent } from "@/content/nav";
import { localeHomePath, localeNames, locales, type Locale } from "@/lib/i18n";
import { switchLocalePath } from "@/lib/localePaths";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useOverlayLock } from "@/lib/useOverlayLock";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { BrandPeriod } from "@/components/ui/BrandPeriod";
import { blogIndexPath } from "@/lib/blogPaths";
import { faqPath } from "@/lib/faqPaths";
import { portfolioIndexPath } from "@/lib/portfolioPaths";
import { LinkPending } from "@/components/ui/LinkPending";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { DURATION, EASE_OUT, SPRING_SNAPPY } from "@/lib/animations";

// bg-background/85 (no /70): al pasar sobre una sección oscura (Services,
// Testimonials, TrustStrip, ClosingStatement — ver CLAUDE.md), el vidrio al
// 70% dejaba pasar tanto negro que la Navbar se leía como una barra gris
// sucia en vez de un panel blanco (bug real, visto en auditoría visual).
const GLASS = "bg-background/85 shadow-lg shadow-black/5 backdrop-blur-xl";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const locale = useLocale();
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  // "Inicio" se dejó fuera a propósito: el logo ya lleva a home, y con 6
  // links + selector de idioma + CTA, el contenedor `max-w-4xl` del estado
  // "scrolled" no tenía ancho suficiente — "Preguntas Frecuentes"/"Cotizar
  // Proyecto" se partían en dos líneas (bug real, visto en auditoría visual).
  const navLinks = [
    { label: navData.servicios, href: servicesIndexPath(locale), esOnly: false },
    { label: navData.portafolio, href: portfolioIndexPath(locale), esOnly: false },
    { label: navData.equipo, href: `${prefix}/equipo`, esOnly: false },
    // El blog ya tiene versión en los tres idiomas (ver CLAUDE.md) — deja
    // de ser esOnly, su ruta usa el mismo helper que servicios/equipo.
    { label: navData.blog, href: blogIndexPath(locale), esOnly: false },
    { label: navData.faq, href: faqPath(locale), esOnly: false },
    // El cotizador es una ruta real y de las más útiles para el visitante, pero la píldora de escritorio no da
    // para 6 enlaces por debajo de `lg` (ver el bug de arriba): ahí se oculta; el cajón móvil y el Footer lo enlazan.
    { label: navData.cotizador, href: `${prefix}/cotizador`, esOnly: false, hideBelowLg: true },
  ];
  const contactHref = `${prefix}/#contacto`;
  // Estando ya en esta home, sus anclas (`/#servicios`, el logo, el CTA)
  // hacían prefetch RSC de la misma página que se está viendo — descargas
  // inútiles compitiendo por red durante la carga. Desde otras rutas
  // (/blog, /equipo) el prefetch sí acelera la navegación y se mantiene.
  const pathname = usePathname();
  const homePrefetch = pathname === homePath ? false : undefined;
  const prefetchFor = (href: string) => (href.startsWith(`${prefix}/#`) ? homePrefetch : undefined);
  // Solo los links de ruta real pueden marcarse como activos: los de ancla
  // (`/#portfolio`, `/#faq`) apuntan a la home y `usePathname()` no ve el
  // hash, así que "Portafolio" y "FAQ" quedarían activos en toda la home.
  const isActive = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  // Móvil: la barra se esconde al bajar y reaparece al subir (patrón de app nativa), así el contenido
  // gana ~80 px de pantalla mientras se lee. Solo por debajo de `sm`; en escritorio no se mueve. Con
  // reduced motion, `MotionConfig reducedMotion="user"` hace el cambio instantáneo en vez de deslizarlo.
  const isMobile = useMediaQuery("(max-width: 639px)");
  const { scrollY } = useScroll();
  const [hideOnScroll, setHideOnScroll] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (Math.abs(y - previous) < 6) return;
    const next = y > previous && y > 160;
    setHideOnScroll((current) => (current === next ? current : next));
  });
  const headerHidden = isMobile && hideOnScroll && !isOpen;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={false}
      animate={{ y: headerHidden ? "-150%" : 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      // Si el foco de teclado entra en la barra escondida, vuelve a mostrarse.
      onFocusCapture={() => setHideOnScroll(false)}
      className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6 lg:px-8"
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-2 rounded-full transition-[max-width,padding,background-color,border-color,box-shadow] duration-300 ease-out",
          scrolled ? cn("max-w-4xl py-2 pl-3 pr-2", GLASS) : "max-w-7xl bg-transparent py-1",
        )}
      >
        <div>
          <Link
            href={homePath}
            prefetch={homePrefetch}
            className="group flex items-center gap-2 rounded-full py-1.5 pr-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={navData.logoAria}
            onClick={() => setIsOpen(false)}
          >
            <span
              className="flex h-8 items-center rounded-full transition-transform duration-300 ease-out group-hover:scale-110"
            >
              <ThemedLogo
                variant="mark"
                alt=""
                width={110}
                height={63}
                priority
                fetchPriority="high"
                className="h-6 w-auto"
              />
            </span>
          </Link>
        </div>

        {/* Desktop Links — su propia tarjeta de vidrio cuando flota sola, se funde con el contenedor al hacer scroll */}
        <ul
          className={cn(
            "hidden items-center gap-1 rounded-full transition-[padding,background-color,border-color,box-shadow] duration-300 ease-out sm:flex",
            scrolled ? "bg-transparent p-0 shadow-none" : cn("p-1.5", GLASS),
          )}
        >
          {navLinks.map((link) => (
            <li key={link.href} className={link.hideBelowLg ? "max-lg:hidden" : undefined}>
              <Link
                href={link.href}
                prefetch={prefetchFor(link.href)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "relative isolate inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors duration-200 ease-out hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive(link.href) ? "text-foreground" : "text-foreground/80",
                )}
              >
                {/* Píldora compartida (`layoutId`): al navegar entre secciones se
                    desliza de un link al otro en vez de apagarse y encenderse.
                    Con reduced motion, `MotionConfig` deshabilita el layout
                    animado y simplemente cambia de sitio. */}
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-active-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-foreground/[0.07]"
                    transition={SPRING_SNAPPY}
                  />
                )}
                {link.label}
                {link.esOnly && <EsBadge />}
                <LinkPending />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">

          {/* En móvil el idioma y el tema viven dentro del menú: la barra queda en logo + menú. */}
          <LanguageSwitcher locale={locale} className="hidden items-center sm:flex" />
          <ThemeToggle className="max-sm:hidden" />

          {/* Desktop Contact button — sin halo/pulso: es el único CTA de
              acento visible en todo momento en la página, no necesita
              reforzarse más, y `animate-pulse-glow` nunca existió en
              globals.css (la clase no hacía nada). */}
          <Magnetic strength={0.2} range={60} className="hidden sm:inline-flex">
            <Button
              href={contactHref}
              prefetch={homePrefetch}
              variant="accent"
              size="sm"
              aria-label={navData.contactoAria}
              className="whitespace-nowrap"
            >
              {navData.contacto}
            </Button>
          </Magnetic>

          {/* Hamburger Menu Button (Mobile) */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent sm:hidden",
              GLASS,
            )}
            aria-label={navData.openMenu}
          >
            <List size={20} />
          </button>
        </div>



        <MobileMenuSheet
          open={isOpen}
          onClose={() => setIsOpen(false)}
          links={navLinks}
          isActive={isActive}
          prefetchFor={prefetchFor}
          locale={locale}
          pathname={pathname}
          homePath={homePath}
          homePrefetch={homePrefetch}
          contactHref={contactHref}
        />
      </div>
    </motion.header>
  );
}


type NavLink = { label: string; href: string; esOnly: boolean; hideBelowLg?: boolean };

const noopSubscribe = () => () => {};

/** Escalonado de la hoja: los enlaces entran uno tras otro (60 ms), subiendo 16 px. */
const SHEET_LIST: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

/**
 * Menú móvil como hoja de pantalla completa (antes, una tarjeta pequeña bajo la barra): enlaces
 * grandes y numerados en mono, el punto del logo marcando la página actual, y abajo idioma, tema
 * y el CTA. Va en un portal a `<body>` para que `useOverlayLock` deje `inert` el resto de la página
 * (foco y lector de pantalla quedan dentro) y bloquee el scroll; `useFocusTrap` va DESPUÉS (ver el
 * comentario de ese hook). Escape lo cierra (efecto en `Navbar`).
 */
function MobileMenuSheet({
  open,
  onClose,
  links,
  isActive,
  prefetchFor,
  locale,
  pathname,
  homePath,
  homePrefetch,
  contactHref,
}: {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  isActive: (href: string) => boolean;
  prefetchFor: (href: string) => false | undefined;
  locale: Locale;
  pathname: string;
  homePath: string;
  homePrefetch: false | undefined;
  contactHref: string;
}) {
  const navData = getNavContent(locale);
  const reduced = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  // El portal solo puede montarse en el cliente (en el servidor no hay `document.body`).
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useOverlayLock(open, sheetRef);
  useFocusTrap(open, sheetRef);

  const item: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
  };

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={navData.menuTitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          // z-[70]: la misma capa que `Modal` (es un diálogo), sobre el CookieBanner (65).
          className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-2xl sm:hidden"
        >
          <div className="flex items-center justify-between px-4 pt-5">
            <Link
              href={homePath}
              prefetch={homePrefetch}
              onClick={onClose}
              aria-label={navData.logoAria}
              className="flex min-h-11 items-center rounded-full pr-2 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ThemedLogo variant="mark" alt="" width={110} height={63} className="h-6 w-auto" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={navData.closeMenu}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/10 text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={20} />
            </button>
          </div>

          <motion.ul
            variants={SHEET_LIST}
            initial="hidden"
            animate="show"
            className="flex-1 overflow-y-auto px-6 pt-8"
          >
            {links.map((link, index) => {
              const active = isActive(link.href);
              return (
                <motion.li key={link.href} variants={item}>
                  <Link
                    href={link.href}
                    prefetch={prefetchFor(link.href)}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className="relative flex min-h-16 items-baseline gap-4 border-b border-foreground/10 py-3 text-3xl font-semibold tracking-[-0.03em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:opacity-60"
                  >
                    <span className="w-6 shrink-0 font-mono text-xs font-medium tracking-normal text-foreground/60">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      {link.label}
                      {active && <BrandPeriod />}
                    </span>
                    {link.esOnly && <EsBadge />}
                    <LinkPending />
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>

          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4 border-t border-foreground/10 px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Enlaces reales a esta misma página en los otros idiomas (mismo criterio que el Footer). */}
              <nav aria-label={navData.languageLabel}>
                <ul className="flex items-center gap-1 rounded-full border border-foreground/10 p-1">
                  {locales.map((target) => (
                    <li key={target}>
                      {target === locale ? (
                        <span
                          aria-current="true"
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-foreground px-3 font-mono text-xs font-semibold text-background uppercase"
                        >
                          {target}
                        </span>
                      ) : (
                        <Link
                          href={switchLocalePath(pathname, target)}
                          hrefLang={target}
                          lang={target}
                          aria-label={localeNames[target]}
                          onClick={onClose}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-mono text-xs font-semibold text-foreground/70 uppercase outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {target}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
              <ThemeToggle variant="segmented" className="min-w-40 flex-1" />
            </div>
            <Button
              href={contactHref}
              prefetch={homePrefetch}
              variant="accent"
              size="lg"
              onClick={onClose}
              className="w-full justify-center"
            >
              {navData.quickContact}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
