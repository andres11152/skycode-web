"use client";

import { useEffect, useState } from "react";
import { HOME_RAIL_SECTIONS, RAIL_COPY } from "@/lib/sectionRail";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Indicador lateral de sección de la home (escritorio ancho): una columna de puntos fija a la
 * derecha, con la sección actual marcada y su nombre al pasar el cursor o enfocar. Cada punto es
 * un enlace de ancla real (funciona con teclado y sin JS).
 *
 * La sección activa se decide por scroll (la última cuyo borde superior pasó el 40% de la
 * ventana), no con IntersectionObserver — mismo criterio y mismo motivo que `PageToc`. Los puntos
 * van en blanco con `mix-blend-mode: difference`: se invierten solos y se ven igual sobre las
 * bandas claras y las oscuras, sin tener que saber en cuál está. Solo `transform`/`opacity`.
 */
export function SectionRail({ locale }: { locale: Locale }) {
  const [active, setActive] = useState<string>(HOME_RAIL_SECTIONS[0]);
  const copy = RAIL_COPY[locale];

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold = window.innerHeight * 0.4;
      let current: string = HOME_RAIL_SECTIONS[0];
      for (const id of HOME_RAIL_SECTIONS) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= threshold) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav
      aria-label={copy.aria}
      // z-[35]: bajo el botón de WhatsApp (40) y el Navbar (50). Solo en pantallas anchas y con alto
      // suficiente para 10 objetivos de 44 px.
      className="pointer-events-none fixed top-1/2 right-5 z-[35] hidden -translate-y-1/2 text-white mix-blend-difference xl:block [@media(max-height:620px)]:hidden"
    >
      <ul className="pointer-events-auto flex flex-col items-end">
        {HOME_RAIL_SECTIONS.map((id) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={isActive ? "true" : undefined}
                className="group flex h-11 items-center gap-3 rounded-full pr-1 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="font-mono text-[11px] tracking-wide whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  {copy.labels[id]}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-1.5 w-1.5 rounded-full bg-current transition-[transform,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none",
                    isActive ? "scale-[1.8] opacity-100" : "opacity-40 group-hover:opacity-80",
                  )}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
