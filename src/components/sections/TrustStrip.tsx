"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileCheck2, Scale, ShieldCheck, Unlock } from "lucide-react";
import { getTrustContent } from "@/content/trust";
import { defaultLocale, type Locale } from "@/lib/i18n";

const icons = [ShieldCheck, Scale, FileCheck2, Unlock];

export function TrustStrip({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const trustData = getTrustContent(locale);
  const items = trustData.items.map((item, index) => ({ ...item, icon: icons[index] || icons[0] }));

  // Duplicamos los elementos para el bucle infinito — con reduced-motion no hay
  // bucle que cerrar, así que basta con una sola pasada estática.
  const marqueeItems = reduced ? items : [...items, ...items, ...items, ...items];

  return (
    <div
      role="group"
      aria-label={trustData.ariaLabel}
      className="relative w-full overflow-hidden border-y border-background/10 bg-foreground py-5"
    >
      {/* Desvanecimiento de bordes con gradiente para una estética premium */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-foreground to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-foreground to-transparent" />

      <div className={reduced ? "flex flex-wrap justify-center gap-x-10 gap-y-3 px-4" : "flex w-max"}>
        <motion.div
          animate={reduced ? undefined : { x: [0, "-50%"] }}
          transition={
            reduced
              ? undefined
              : {
                  ease: "linear",
                  duration: 25,
                  repeat: Infinity,
                }
          }
          className={reduced ? "flex flex-wrap items-center justify-center gap-x-10 gap-y-3" : "flex items-center gap-16 pr-16"}
        >
          {marqueeItems.map(({ icon: Icon, label }, index) => (
            <div
              key={`${label}-${index}`}
              // Solo la primera pasada (índices 0..items.length-1) es contenido
              // real para lectores de pantalla — las copias 2ª/3ª/4ª existen
              // solo para el bucle visual continuo del marquee.
              aria-hidden={index >= items.length}
              className="group flex shrink-0 items-center gap-3 text-sm font-semibold tracking-wide text-background/80 transition-colors duration-200 hover:text-accent"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/10 text-background/60 transition-colors duration-300 group-hover:bg-accent/15 group-hover:text-accent">
                <Icon size={16} />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
