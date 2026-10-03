"use client";

import { useRef } from "react";
import Image from "next/image";
import { m as motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { BrowserFrame } from "@/components/ui/BrowserFrame";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { getPortfolioIcon } from "@/content/portfolioShared";
import { cn } from "@/lib/utils";

// Recorrido del parallax en % del alto del propio contenedor (no en px). La
// imagen se escala 1.1 dentro de un contenedor `overflow-hidden`, lo que deja
// 5% de margen por lado a cualquier tamaño; un recorrido de 4% garantiza que
// nunca se asome el borde, ni en móvil (alto ~200px) ni en desktop.
const PARALLAX_RANGE = 4;
const PARALLAX_SCALE = 1.1;

/**
 * Capa con parallax de scroll. Es un componente aparte a propósito: los hooks
 * `useScroll`/`useTransform` no pueden llamarse de forma condicional, así que
 * `CaseVisual` solo monta esta capa cuando de verdad hay parallax — la home
 * y el detalle no pagan el seguimiento de scroll por imágenes que no lo usan.
 * El objetivo del scroll es la propia capa (su caja de layout no cambia con
 * `transform`), no un contenedor externo.
 */
function ParallaxLayer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${PARALLAX_RANGE}%`, `${PARALLAX_RANGE}%`]);
  return (
    <motion.div
      ref={ref}
      // `motion-reduce:transform-none!` apaga el parallax por CSS con prefers-reduced-motion,
      // sin depender de que `useReducedMotion()` ya haya leído la preferencia en el primer render.
      className="absolute inset-0 motion-reduce:transform-none!"
      style={{ y, scale: PARALLAX_SCALE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Captura de un caso dentro de un marco de navegador, con tres capas:
 *  - morph de vista (`project-cover-{slug}`) sobre el ÁREA DE IMAGEN, no sobre
 *    la barra del marco: así el par origen/destino tiene la misma identidad
 *    visual aunque cambie la proporción entre el listado y el detalle;
 *  - parallax opcional de scroll (solo `transform`, GPU-friendly);
 *  - degradación a la portada procedural (`ProjectCover`) si no hay captura.
 *
 * Es el mismo componente en el índice, el detalle y "siguiente caso" para que
 * las tres superficies se vean y animen como un solo sistema.
 */
export function CaseVisual({
  slug,
  imageSrc,
  alt,
  industryIcon,
  url,
  sizes,
  priority = false,
  parallax = false,
  onDark = false,
  aspectClassName = "aspect-[16/10]",
  className,
}: {
  slug: string;
  imageSrc: string | null;
  alt: string;
  industryIcon: string;
  url?: string;
  sizes: string;
  priority?: boolean;
  parallax?: boolean;
  onDark?: boolean;
  aspectClassName?: string;
  className?: string;
}) {
  const reduced = Boolean(useReducedMotion());
  const withParallax = parallax && !reduced && Boolean(imageSrc);
  const image = imageSrc ? (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      // Next 16: `priority` está deprecado en favor de `preload`; `fetchPriority` explícito
      // porque la precarga sola salía sin `fetchpriority=high` (Lighthouse lcp-discovery).
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      sizes={sizes}
      className="object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
    />
  ) : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        onDark ? "border-background/15" : "border-foreground/10",
        className,
      )}
    >
      <BrowserFrame url={url} onDark={onDark} className="rounded-none">
        <MorphTransition name={`project-cover-${slug}`}>
          <div
            className={cn("relative w-full overflow-hidden", aspectClassName, onDark ? "bg-background/10" : "bg-foreground/10")}
          >
            {imageSrc ? (
              withParallax ? (
                <ParallaxLayer>{image}</ParallaxLayer>
              ) : (
                <div className="absolute inset-0">{image}</div>
              )
            ) : (
              <ProjectCover
                icon={getPortfolioIcon(industryIcon)}
                className="h-full w-full"
                iconClassName="h-20 w-20"
              />
            )}
          </div>
        </MorphTransition>
      </BrowserFrame>
    </div>
  );
}
