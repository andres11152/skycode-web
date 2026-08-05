"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getTrustContent } from "@/content/trust";
import { defaultLocale, type Locale } from "@/lib/i18n";

const OwaspIcon = () => (
  <svg className="w-4 h-4 text-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <defs>
      <linearGradient id="owaspGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0089CD" />
        <stop offset="100%" stopColor="#006998" />
      </linearGradient>
    </defs>
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="url(#owaspGrad)" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5" stroke="#0089CD" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12l10 5 10-5" stroke="#006998" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="1.5" fill="#006998" />
  </svg>
);

const ComplianceIcon = () => (
  <svg className="w-4 h-4 text-current transition-transform duration-500 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <defs>
      <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#006998" />
        <stop offset="100%" stopColor="#0089CD" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="8" stroke="url(#compGrad)" strokeDasharray="3 2" />
    <path d="M12 6v12M6 12h12" stroke="#0089CD" strokeLinecap="round" />
    <rect x="10" y="10" width="4" height="4" rx="1" fill="#006998" />
  </svg>
);

const DocIcon = () => (
  <svg className="w-4 h-4 text-current transition-transform duration-300 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <defs>
      <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0089CD" />
        <stop offset="100%" stopColor="#006998" />
      </linearGradient>
    </defs>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#0089CD" strokeLinecap="round" />
    <path d="M6 2h14v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6 2z" stroke="url(#docGrad)" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7h6M9 11h6" stroke="#0089CD" strokeLinecap="round" />
  </svg>
);

const TransferIcon = () => (
  <svg className="w-4 h-4 text-current transition-transform duration-300 group-hover:scale-105" viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <defs>
      <linearGradient id="transGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#006998" />
        <stop offset="100%" stopColor="#0089CD" />
      </linearGradient>
    </defs>
    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="url(#transGrad)" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 4v2M12 16v2" stroke="#0089CD" strokeLinecap="round" />
    <circle cx="12" cy="11" r="2" fill="#006998" />
  </svg>
);

const icons = [OwaspIcon, ComplianceIcon, DocIcon, TransferIcon];

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
                <Icon />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
