"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useLightboxZoomed } from "@/components/ui/lightboxContext";
import { GALLERY_RAIL_SIZES } from "@/components/portfolio/GalleryRail";
import { cn } from "@/lib/utils";
import type { PortfolioImage } from "@/content/portfolioShared";

/** Imagen que se funde sobre las capas de abajo cuando termina de cargar (o ya estaba en caché). */
function FadeLayer({
  src,
  alt,
  sizes,
  blurDataURL,
  fadeIn = true,
}: {
  src: string;
  alt: string;
  sizes: string;
  blurDataURL?: string | null;
  fadeIn?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  // `complete` cubre la imagen que llegó antes de hidratar (el onLoad ya pasó) o salió de caché.
  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    <Image
      ref={ref}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      onLoad={() => setLoaded(true)}
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL ?? undefined}
      className={cn(
        "object-contain",
        fadeIn && "motion-safe:transition-opacity motion-safe:duration-200",
        fadeIn && !loaded && "opacity-0",
      )}
    />
  );
}

/**
 * Captura dentro del visor, en capas para que nunca se vea un hueco:
 *  1. vista previa `md` con el mismo `src`/`sizes` que la miniatura del carrusel (ya en caché,
 *     se ve al instante aunque ampliada y suave) — decorativa, sin texto alternativo;
 *  2. `lg` encima, que se funde al llegar y lleva el texto alternativo;
 *  3. `xl` (solo con zoom y si la imagen la tiene) para que el detalle ampliado sea nítido en pantallas retina.
 */
export function CaptureSlide({ image, alt }: { image: PortfolioImage; alt: string }) {
  const zoomed = useLightboxZoomed();
  return (
    <div className="relative h-full w-full" style={image.color ? { backgroundColor: image.color } : undefined}>
      <div aria-hidden="true" className="absolute inset-0">
        <FadeLayer src={image.variants.md} alt="" sizes={GALLERY_RAIL_SIZES} blurDataURL={image.blurDataURL} fadeIn={false} />
      </div>
      <FadeLayer src={image.variants.lg} alt={alt} sizes="92vw" />
      {zoomed && image.variants.xl && (
        <div aria-hidden="true" className="absolute inset-0">
          <FadeLayer src={image.variants.xl} alt="" sizes="250vw" />
        </div>
      )}
    </div>
  );
}
