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

  return (
    <svg
      viewBox={technology.icon.viewBox}
      width={size}
      height={size}
      role="img"
      aria-label={technology.name}
      className={`fill-foreground/70 transition-colors duration-200 hover:fill-[var(--tech-icon-hex)] ${className ?? ""}`}
      style={{ "--tech-icon-hex": `#${technology.icon.hex}` } as CSSProperties}
    >
      <path d={technology.icon.pathD} />
    </svg>
  );
}
