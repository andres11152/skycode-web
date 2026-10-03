"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CaretLeft, CaretRight, CornersOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { PortfolioImage } from "@/content/portfolioShared";

const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Carrusel horizontal de capturas con `scroll-snap` nativo: el navegador hace
 * el arrastre/inercia (táctil y trackpad) y el teclado puede enfocar la región
 * y desplazarla con las flechas. Los botones prev/next son un atajo para ratón,
 * no el único camino. Sin librería de carrusel y sin JS por frame.
 */
export function GalleryRail({
  images,
  title,
  regionLabel,
  prevLabel,
  nextLabel,
  expandLabel,
  onOpen,
}: {
  images: PortfolioImage[];
  title: string;
  regionLabel: string;
  prevLabel: string;
  nextLabel: string;
  expandLabel: string;
  onOpen: (index: number) => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const syncEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const start = rail.scrollLeft <= 4;
    const end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    // Mismo valor => mismo objeto, así el scroll no re-renderiza por frame.
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges, images.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
          <span className="ml-3 font-mono text-sm font-normal text-foreground/60">
            {String(images.length).padStart(2, "0")}
          </span>
        </h2>
        {images.length > 1 && (
          <div className="flex gap-2">
            {([-1, 1] as const).map((direction) => {
              const disabled = direction === -1 ? edges.start : edges.end;
              const Caret = direction === -1 ? CaretLeft : CaretRight;
              return (
                <button
                  key={direction}
                  type="button"
                  onClick={() => scrollByPage(direction)}
                  disabled={disabled}
                  aria-label={direction === -1 ? prevLabel : nextLabel}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-colors duration-150",
                    "hover:border-foreground/35 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
                    FOCUS,
                  )}
                >
                  <Caret size={18} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* tabIndex=0 + role=region: región desplazable alcanzable por teclado (axe: scrollable-region-focusable). */}
      <div
        ref={railRef}
        onScroll={syncEdges}
        role="region"
        aria-label={regionLabel}
        tabIndex={0}
        className={cn(
          "-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          FOCUS,
        )}
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`${expandLabel}: ${index + 1} / ${images.length}`}
            className={cn(
              "group relative aspect-[16/10] w-[86%] shrink-0 snap-start overflow-hidden rounded-xl border border-foreground/10 bg-foreground/5 sm:w-[58%] lg:w-[48%]",
              "transition-colors duration-200 hover:border-foreground/30",
              FOCUS,
            )}
          >
            <Image
              src={image.variants.md}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 86vw, (max-width: 1024px) 58vw, 560px"
              className="object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/60 text-background opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <CornersOut size={16} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
