import type { CSSProperties } from "react";
import { getTrustContent } from "@/content/trust";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/CountUp";

// Columnas en escritorio según cuántos ítems haya: una grilla fija de 4 dejaba el quinto ítem solo en una segunda fila.
const DESKTOP_COLUMNS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * Franja AMARILLA de marca (`.band-yellow`, como las piezas "Guárdalo" de Instagram) con las
 * capacidades propias (OWASP, protección de datos, documentación, código transferible), justo
 * bajo el Hero. Estática y sin íconos: antes era un marquee infinito con un pictograma de
 * degradado azul por ítem. Numeradas en mono y separadas por filetes, se leen de una vez.
 * Texto negro sobre amarillo (los tokens los reasigna `.band-yellow`). Los compromisos con cifra
 * publicada (garantía, propiedad del código) se muestran como número grande que cuenta al entrar en
 * pantalla (`CountUp`); en móvil, mosaico de 2 columnas en vez de 5 filas de texto.
 */
export function TrustStrip({ locale = defaultLocale }: { locale?: Locale }) {
  const trustData = getTrustContent(locale);

  return (
    <div role="group" aria-label={trustData.ariaLabel} className="w-full border-y border-on-inverse/10 band-yellow">
      <ul
        className={cn(
          "mx-auto grid max-w-6xl grid-cols-2 gap-x-5 gap-y-7 px-6 py-8 sm:gap-0 sm:divide-y-0 sm:py-0 lg:divide-x lg:divide-on-inverse/10",
          DESKTOP_COLUMNS[trustData.items.length] ?? "lg:grid-cols-4",
        )}
      >
        {trustData.items.map((item, index) => (
          <li
            key={item.label}
            style={{ "--i": index } as CSSProperties}
            className="reveal-up flex text-sm leading-snug font-medium text-on-inverse last:odd:col-span-2 sm:py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0 lg:last:odd:col-span-1"
          >
            {item.stat !== undefined ? (
              <span className="flex flex-col gap-1.5">
                <CountUp
                  value={item.stat}
                  suffix={item.unit}
                  className="text-4xl leading-none font-semibold tracking-[-0.04em] sm:text-5xl"
                />
                <span>{item.statLabel}</span>
              </span>
            ) : (
              <span className="flex items-baseline gap-4">
                <span className="font-mono text-xs text-on-inverse/70">{String(index + 1).padStart(2, "0")}</span>
                <span>{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
