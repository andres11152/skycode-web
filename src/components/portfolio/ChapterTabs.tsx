"use client";

import { useEffect, useRef, useState } from "react";
import { m as motion } from "framer-motion";
import { SPRING_SNAPPY } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Pestañas fijas con los capítulos del caso de estudio, por debajo de `lg` (en escritorio cada
 * capítulo ya tiene su etiqueta fija a la izquierda). Son enlaces de ancla reales (funcionan sin JS);
 * la pestaña activa sigue al scroll con el mismo criterio que `PageToc` (el último capítulo cuyo borde
 * superior pasó el 30% de la ventana; un IntersectionObserver activaba el siguiente al subir) y la
 * píldora se desliza entre pestañas (`layoutId`). La pestaña activa se mantiene a la vista dentro de
 * la barra horizontal.
 */
export function ChapterTabs({ label, chapters }: { label: string; chapters: { key: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const barRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.3;
        let current: string | null = null;
        for (const chapter of chapters) {
          const section = document.getElementById(`capitulo-${chapter.key}`);
          if (section && section.getBoundingClientRect().top <= line) current = chapter.key;
        }
        setActive((previous) => (previous === current ? previous : current));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [chapters]);

  // Desplaza la barra (no la página) para que la pestaña activa no quede cortada.
  useEffect(() => {
    const bar = barRef.current;
    const tab = active ? bar?.querySelector<HTMLElement>(`[data-chapter="${active}"]`) : null;
    if (!bar || !tab) return;
    const target = tab.offsetLeft - bar.clientWidth / 2 + tab.offsetWidth / 2;
    bar.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label={label}
      // `top-0` en móvil (la barra del sitio se esconde al bajar), bajo la barra flotante en tablet.
      className="sticky top-0 z-30 -mx-6 border-b border-foreground/10 bg-background/85 backdrop-blur-xl sm:top-20 lg:hidden"
    >
      <ul
        ref={barRef}
        className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chapters.map((chapter) => {
          const isActive = chapter.key === active;
          return (
            <li key={chapter.key} data-chapter={chapter.key} className="shrink-0">
              <a
                href={`#capitulo-${chapter.key}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative isolate inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                  isActive ? "font-semibold text-foreground" : "text-foreground/70 hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="chapter-tab-pill"
                    transition={SPRING_SNAPPY}
                    aria-hidden="true"
                    // Misma píldora que el enlace activo del Navbar: funciona igual en claro y oscuro.
                    className="absolute inset-y-1.5 inset-x-0 -z-10 rounded-full bg-foreground/[0.08] ring-1 ring-foreground/10"
                  />
                )}
                {chapter.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
