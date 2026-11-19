"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { animate, m as motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { EASE_OUT, SPRING_SNAPPY } from "@/lib/animations";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SwipeRailLabels {
  /** Botón "anterior". */
  previous: string;
  /** Botón "siguiente". */
  next: string;
  /** Punto de navegación, con `{index}` y `{total}`. */
  goTo: string;
}

/**
 * Carrusel deslizable SOLO en móvil (por debajo de `sm`); desde `sm` sus hijos se reparten con el
 * `className` de escritorio que se pase (normalmente una grilla), así una sección no necesita dos
 * maquetas. La auditoría móvil midió bloques de 2–4 pantallas de scroll vertical (tarjetas una bajo
 * otra): en carrusel ocupan una.
 *
 * - El desplazamiento es `scroll-snap` NATIVO, no `drag` de Framer Motion: la física táctil es la del
 *   sistema, funciona sin JS (el HTML ya trae todas las tarjetas, indexables) y no compite con el
 *   scroll vertical. Framer Motion se usa donde aporta: la píldora de progreso (`layoutId`) y la
 *   "pista" de deslizamiento al entrar en pantalla (el carrusel se asoma 56 px y vuelve).
 * - Accesible: los puntos y las flechas son botones de 44 px con nombre; el carril es una región con
 *   nombre; con reduced motion no hay pista ni desplazamiento animado.
 * - Lista real: `as="ol" | "ul"` envuelve cada hijo en `<li>`.
 */
export function SwipeRail({
  items,
  label,
  labels,
  as = "ul",
  className,
  itemClassName,
  itemClassNames,
  controlsClassName,
}: {
  items: ReactNode[];
  /** Nombre accesible del carril. */
  label: string;
  labels: SwipeRailLabels;
  as?: "ul" | "ol" | "div";
  /** Maqueta desde `sm` (p. ej. `sm:grid sm:grid-cols-3 sm:gap-8`). */
  className?: string;
  itemClassName?: string;
  /** Clases extra por tarjeta, en el mismo orden que `items` (p. ej. el caso destacado a ancho completo). */
  itemClassNames?: string[];
  controlsClassName?: string;
}) {
  const reduced = useReducedMotion();
  const railId = useId();
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const total = items.length;

  const itemOffset = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const child = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !child) return 0;
    return child.offsetLeft - scroller.offsetLeft - parseFloat(getComputedStyle(scroller).paddingLeft || "0");
  }, []);

  // Tarjeta activa = la más cercana al borde izquierdo (con snap, la que quedó alineada).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let best = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < scroller.children.length; index++) {
          const distance = Math.abs(itemOffset(index) - scroller.scrollLeft);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = index;
          }
        }
        setActive((current) => (current === best ? current : best));
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [itemOffset]);

  // Pista de deslizamiento: la primera vez que el carril entra en pantalla (en móvil, sin reduced
  // motion), se asoma la siguiente tarjeta y vuelve. Se apaga el snap mientras dura para que el
  // navegador no lo "corrija" a mitad de camino.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || reduced || total < 2) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    let stop: (() => void) | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || scroller.scrollLeft > 4) return;
        observer.disconnect();
        scroller.style.scrollSnapType = "none";
        const nudge = animate(0, 56, {
          duration: 0.45,
          ease: EASE_OUT,
          delay: 0.35,
          onUpdate: (value) => {
            scroller.scrollLeft = value;
          },
          onComplete: () => {
            const back = animate(56, 0, {
              ...SPRING_SNAPPY,
              onUpdate: (value) => {
                scroller.scrollLeft = value;
              },
              onComplete: () => {
                scroller.style.scrollSnapType = "";
              },
            });
            stop = () => back.stop();
          },
        });
        stop = () => nudge.stop();
      },
      { threshold: 0.6 },
    );
    observer.observe(scroller);
    // Si la persona toca el carril durante la pista, se detiene y le devuelve el control.
    const cancel = () => {
      stop?.();
      scroller.style.scrollSnapType = "";
    };
    scroller.addEventListener("pointerdown", cancel, { passive: true });
    return () => {
      observer.disconnect();
      cancel();
      scroller.removeEventListener("pointerdown", cancel);
    };
  }, [reduced, total]);

  const goTo = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const clamped = Math.max(0, Math.min(total - 1, index));
    scroller.scrollTo({ left: itemOffset(clamped), behavior: reduced ? "auto" : "smooth" });
  };

  const List = as;
  const Item = as === "div" ? "div" : "li";
  const arrowClasses =
    "flex size-11 items-center justify-center rounded-full border border-current/15 outline-none transition-[opacity,transform] active:scale-95 disabled:opacity-30 motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div role="region" aria-label={label}>
      <List
        ref={(element: HTMLElement | null) => {
          scrollerRef.current = element;
        }}
        className={cn(
          // Móvil: carril horizontal con snap que sale del padding de la sección (la siguiente tarjeta asoma).
          "max-sm:-mx-6 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:scroll-px-6 max-sm:px-6 max-sm:pb-1 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {items.map((item, index) => (
          <Item key={index} className={cn("max-sm:w-[85%] max-sm:shrink-0 max-sm:snap-start", itemClassName, itemClassNames?.[index])}>
            {item}
          </Item>
        ))}
      </List>

      {total > 1 && (
        <div className={cn("mt-5 flex items-center justify-between gap-4 sm:hidden", controlsClassName)}>
          <div className="flex items-center">
            {items.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={t(labels.goTo, { index: String(index + 1), total: String(total) })}
                aria-current={index === active ? "true" : undefined}
                className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="relative block size-2 rounded-full bg-current/20">
                  {/* El punto activo se desliza de una posición a otra (layoutId) en vez de apagarse y encenderse. */}
                  {index === active && (
                    <motion.span
                      layoutId={`${railId}-dot`}
                      transition={SPRING_SNAPPY}
                      className="absolute -inset-0.5 rounded-full bg-current"
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label={labels.previous} className={arrowClasses}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goTo(active + 1)} disabled={active === total - 1} aria-label={labels.next} className={arrowClasses}>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
