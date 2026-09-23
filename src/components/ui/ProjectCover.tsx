"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { GridPattern } from "@/components/ui/GridPattern";
import { cn } from "@/lib/utils";

/**
 * Portada procedural de un proyecto: no hay screenshots reales disponibles
 * (los clientes son confidenciales), así que en vez de una captura falsa o un
 * gradiente genérico, reutilizamos el lenguaje visual ya establecido del sitio
 * (GridPattern animado + badge de ícono con glow, mismo tratamiento que
 * CodeMockup del Hero y los íconos de servicio) para darle a cada proyecto una
 * identidad distinta basada en su ícono, no en un asset inventado.
 */
export function ProjectCover({
  icon: Icon,
  imageSrc,
  className,
  iconClassName,
}: {
  icon: PhosphorIcon;
  imageSrc?: string;
  className?: string;
  iconClassName?: string;
}) {
  const reduced = Boolean(useReducedMotion());

  if (imageSrc) {
    return (
      <div className={cn("group/cover relative overflow-hidden bg-foreground rounded-xl border border-foreground/10", className)}>
        <Image
          src={imageSrc}
          alt="Vista previa del proyecto"
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover object-top transition-transform duration-500 ease-out group-hover/cover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover/cover:opacity-30"
        />
      </div>
    );
  }

  return (
    <div className={cn("group/cover relative overflow-hidden bg-foreground", className)}>
      <GridPattern
        width={36}
        height={36}
        className="[mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,white,transparent)] opacity-80"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.18] blur-[70px] transition-opacity duration-300 group-hover/cover:bg-accent/[0.28]"
      />
      <div className="relative flex h-full w-full items-center justify-center">
        <motion.div
          initial={false}
          whileHover={reduced ? undefined : { scale: 1.08, rotate: 3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-xl border border-background/15 bg-background/10 text-background/90 shadow-[0_0_30px_rgba(0,137,205,0.15)] backdrop-blur-sm",
            iconClassName,
          )}
        >
          <Icon size={28} weight="duotone" />
        </motion.div>
      </div>
    </div>
  );
}
