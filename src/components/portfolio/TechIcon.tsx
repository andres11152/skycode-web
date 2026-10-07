import type { CSSProperties } from "react";
import type { PortfolioTechnology } from "@/content/portfolioShared";

/**
 * Ícono de una tecnología del portafolio — sin `"use client"` a propósito:
 * no tiene estado ni interactividad propia, así que funciona igual dentro
 * de un Server Component (el detalle público de un caso) o de uno
 * cliente (el editor del dashboard). El SVG de `simple-icons` ya viene
 * resuelto (`technology.icon`, ver `lib/simpleIcons.ts` y
 * `shapeTechnology()`) — este componente nunca importa `simple-icons`
 * directo, solo dibuja el `path`/`viewBox` que ya le llegan.
 *
 * Monocromo por defecto (`fill-foreground/70`, ver CLAUDE.md — nada de
 * colores de marca sueltos por la página) y el color real de marca (`hex`)
 * solo aparece al pasar el mouse, vía una variable CSS — es el único
 * punto de contacto de color por marca en toda la UI, deliberadamente
 * restringido a esta interacción.
 */
/** Luminancia relativa (WCAG) de un hex de 6 dígitos sin `#`. */
function brandLuminance(hex: string): number {
  const channel = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Por debajo de esto el color de marca (Next.js, GitHub, Vercel…) casi no se distingue sobre fondo oscuro (< ~3:1 contra #0a0a0b). */
const MIN_BRAND_LUMINANCE = 0.1;

export function TechIcon({
  technology,
  size = 20,
  className,
}: {
  technology: PortfolioTechnology;
  size?: number;
  className?: string;
}) {
  if (technology.iconSource === "custom") {
    // eslint-disable-next-line @next/next/no-img-element -- URL externa del bucket público del portafolio, no un asset local optimizable por next/image.
    return <img src={technology.iconRef} alt={technology.name} width={size} height={size} className={className} />;
  }

  if (!technology.icon) return null;

  // Una marca casi negra sobre fondo oscuro desaparecería al pasar el cursor: en ese caso el hover
  // usa el color de texto del tema (negro en claro, casi blanco en oscuro), que además es el de la marca en claro.
  const hoverColor = brandLuminance(technology.icon.hex) < MIN_BRAND_LUMINANCE ? "var(--foreground)" : `#${technology.icon.hex}`;

  return (
    <svg
      viewBox={technology.icon.viewBox}
      width={size}
      height={size}
      role="img"
      aria-label={technology.name}
      className={`fill-foreground/70 transition-colors duration-200 hover:fill-[var(--tech-icon-hex)] ${className ?? ""}`}
      style={{ "--tech-icon-hex": hoverColor } as CSSProperties}
    >
      <path d={technology.icon.pathD} />
    </svg>
  );
}
