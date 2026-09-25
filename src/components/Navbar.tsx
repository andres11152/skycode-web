"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { EsBadge } from "@/components/ui/EsBadge";
import { getNavContent } from "@/content/nav";
import { localeHomePath } from "@/lib/i18n";
import { blogIndexPath } from "@/lib/blogPaths";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";

// bg-background/85 (no /70): al pasar sobre una sección oscura (Services,
// Testimonials, TrustStrip, ClosingStatement — ver CLAUDE.md), el vidrio al
// 70% dejaba pasar tanto negro que la Navbar se leía como una barra gris
// sucia en vez de un panel blanco (bug real, visto en auditoría visual).
const GLASS = "bg-background/85 shadow-lg shadow-black/5 backdrop-blur-xl";
const MOBILE_GLASS = "border border-foreground/15 bg-background/95 shadow-2xl shadow-black/30 backdrop-blur-2xl";

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
    { label: navData.servicios, href: `${prefix}/servicios`, esOnly: false },
    { label: navData.portafolio, href: `${prefix}/#portfolio`, esOnly: false },
    { label: navData.equipo, href: `${prefix}/equipo`, esOnly: false },
    // El blog ya tiene versión en los tres idiomas (ver CLAUDE.md) — deja
    // de ser esOnly, su ruta usa el mismo helper que servicios/equipo.
    { label: navData.blog, href: blogIndexPath(locale), esOnly: false },
    { label: navData.faq, href: `${prefix}/#faq`, esOnly: false },
  ];
  const contactHref = `${prefix}/#contacto`;
  // Estando ya en esta home, sus anclas (`/#servicios`, el logo, el CTA)
  // hacían prefetch RSC de la misma página que se está viendo — descargas
  // inútiles compitiendo por red durante la carga. Desde otras rutas
  // (/blog, /equipo) el prefetch sí acelera la navegación y se mantiene.
  const pathname = usePathname();
  const homePrefetch = pathname === homePath ? false : undefined;
  const prefetchFor = (href: string) => (href.startsWith(`${prefix}/#`) ? homePrefetch : undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-2 rounded-full transition-all duration-300 ease-out",
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
              <Image
                src="/logo-mark.png"
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
            "hidden items-center gap-1 rounded-full transition-all duration-300 ease-out sm:flex",
            scrolled ? "bg-transparent p-0 shadow-none" : cn("p-1.5", GLASS),
          )}
        >
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={prefetchFor(link.href)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 outline-none transition-colors duration-200 ease-out hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {link.label}
                {link.esOnly && <EsBadge />}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">

          <LanguageSwitcher locale={locale} className="flex items-center" />

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
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent sm:hidden",
              GLASS,
            )}
            aria-label={isOpen ? navData.closeMenu : navData.openMenu}
          >
            {isOpen ? <X size={18} /> : <List size={18} />}

          </button>
        </div>



        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div
            className={cn(
              "absolute inset-x-0 top-14 z-40 flex flex-col gap-3 rounded-xl p-4 sm:hidden animate-in fade-in zoom-in-95 duration-200",
              MOBILE_GLASS,
            )}
          >
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={prefetchFor(link.href)}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                  >
                    {link.label}
                    {link.esOnly && (
                      <span className="rounded border border-foreground/15 px-1 text-[10px] font-semibold text-foreground/60">
                        ES
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <Button
              href={contactHref}
              prefetch={homePrefetch}
              variant="accent"
              size="md"
              onClick={() => setIsOpen(false)}
              className="w-full justify-center"
            >
              {navData.contacto}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

