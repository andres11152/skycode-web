"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { m as motion } from "framer-motion";
import { SPRING_SNAPPY } from "@/lib/animations";
import { cn } from "@/lib/utils";

// NumberFlow (~11 KB gzip) solo anima el cambio de cifra: hasta que el navegador está ocioso se muestra el
// mismo texto, formateado con `Intl`, y recién entonces se descarga la librería. Antes viajaba en el JS
// inicial de la portada aunque esta sección esté bajo el primer pliegue.
const NumberFlow = dynamic(() => import("@number-flow/react"), { ssr: false });

function AnimatedNumber({
  value,
  animated,
  locales,
  format,
  prefix = "",
  suffix = "",
}: {
  value: number;
  animated: boolean;
  locales?: string;
  format?: { maximumFractionDigits?: number };
  prefix?: string;
  suffix?: string;
}) {
  if (animated) return <NumberFlow value={value} locales={locales} format={format} prefix={prefix} suffix={suffix} />;
  return (
    <>
      {prefix}
      {new Intl.NumberFormat(locales, format).format(value)}
      {suffix}
    </>
  );
}

export interface EstimatorPreviewType {
  id: string;
  title: string;
  /** Precio base ya resuelto en la moneda de `currency`. */
  price: number;
  weeks: number;
}

/**
 * Vista previa del cotizador dentro de la home: elegir el tipo de proyecto
 * actualiza al instante el "desde" y las semanas (cifras animadas con
 * NumberFlow). Los precios son los mismos del cotizador completo (`PRICING`) y
 * llegan resueltos por prop; el detalle (módulos, ritmo, correo) vive en
 * `/cotizador`. Es un `radiogroup` real: flechas del teclado y lector de pantalla.
 */
export function EstimatorPreview({
  types,
  currency,
  numberLocale,
  copy,
}: {
  types: EstimatorPreviewType[];
  currency: "COP" | "USD";
  numberLocale: string;
  copy: { groupLabel: string; fromLabel: string; weeksSuffix: string };
}) {
  const [selectedId, setSelectedId] = useState(types[0]?.id ?? "");
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const enable = () => setAnimated(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(enable, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(enable, 2500);
    return () => globalThis.clearTimeout(id);
  }, []);
  const selected = types.find((type) => type.id === selectedId) ?? types[0];
  if (!selected) return null;

  // Prefijo "$" y código de moneda como sufijo: "$ 10.500.000 COP" no deja dudas de qué moneda es.
  const format = { maximumFractionDigits: 0 } as const;

  const move = (delta: number, from: number) => {
    const next = types[(from + delta + types.length) % types.length];
    if (!next) return;
    setSelectedId(next.id);
    document.getElementById(`estimator-type-${next.id}`)?.focus();
  };

  return (
    <div className="rounded-xl border border-foreground/10 bg-background">
      <div role="radiogroup" aria-label={copy.groupLabel} className="divide-y divide-foreground/10">
        {types.map((type, index) => {
          const isSelected = type.id === selected.id;
          return (
            <button
              key={type.id}
              id={`estimator-type-${type.id}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedId(type.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                  event.preventDefault();
                  move(1, index);
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  move(-1, index);
                }
              }}
              className={cn(
                "relative isolate flex min-h-14 w-full items-center gap-4 px-5 py-3 text-left outline-none transition-colors duration-150 first:rounded-t-xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                !isSelected && "hover:bg-foreground/[0.02]",
              )}
            >
              {/* Fondo compartido (`layoutId`): al cambiar de tipo de proyecto se desliza de una fila a otra
                  en vez de apagarse y encenderse (mismo lenguaje que la píldora del Navbar). */}
              {isSelected && (
                <motion.span
                  layoutId="estimator-active"
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-foreground/[0.05]"
                  transition={SPRING_SNAPPY}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                  isSelected ? "border-foreground" : "border-foreground/30",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full bg-foreground transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none", isSelected ? "scale-100" : "scale-0")} />
              </span>
              <span className={cn("text-sm sm:text-base", isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                {type.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-start gap-3 rounded-b-xl bg-foreground p-6 text-background sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-8">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-background/70">{copy.fromLabel}</p>
          <p aria-live="polite" className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            <AnimatedNumber animated={animated} value={selected.price} locales={numberLocale} format={format} prefix="$" suffix={` ${currency}`} />
          </p>
        </div>
        <p className="pb-1 font-mono text-sm whitespace-nowrap text-background/80 sm:text-right">
          <AnimatedNumber animated={animated} value={selected.weeks} /> {copy.weeksSuffix}
        </p>
      </div>
    </div>
  );
}
