"use client";

import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { SPRING_SNAPPY } from "@/lib/animations";
import { cn } from "@/lib/utils";

export interface PageTocItem {
  id: string;
  label: string;
}

/**
 * Índice lateral con scrollspy (artículos del blog y detalle de servicios):
 * la sección activa se marca con una barra compartida (`layoutId`) que se
 * desliza entre entradas — mismo lenguaje que la píldora activa del Navbar.
 * Con reduced motion, `MotionConfig` la hace saltar sin deslizar.
 *
 * El activo es el ÚLTIMO encabezado cuyo borde superior ya pasó la línea
 * del 30% de la ventana — no el que cruza una banda con un
 * `IntersectionObserver`: un encabezado es un elemento diminuto y, al
 * subir, el observer activaba el siguiente en vez de la sección en la que
 * uno realmente está.
 */
export function PageToc({
  items,
  label,
  layoutId = "page-toc-active",
}: {
  items: PageTocItem[];
  label: string;
  /** Distinto por página si alguna vez conviven dos índices en pantalla. */
  layoutId?: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let current = elements[0].id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= line) current = element.id;
      }
      setActiveId((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    // Primera medición diferida (no un setState síncrono dentro del efecto).
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  return (
    <nav aria-label={label}>
      <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">{label}</p>
      <ul className="flex flex-col border-l border-foreground/10">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id} className="relative">
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  aria-hidden="true"
                  className="absolute -left-px top-0 h-full w-0.5 rounded-full bg-accent-strong"
                  transition={SPRING_SNAPPY}
                />
              )}
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-r-md py-1 pl-4 text-sm leading-snug outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive ? "font-semibold text-foreground" : "text-foreground/70 hover:text-foreground",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
