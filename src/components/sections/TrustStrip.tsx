import type { CSSProperties } from "react";
import { getTrustContent } from "@/content/trust";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Columnas en escritorio según cuántos ítems haya: una grilla fija de 4 dejaba el quinto ítem solo en una segunda fila.
const DESKTOP_COLUMNS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * Franja oscura con las cuatro capacidades propias (OWASP, protección de datos,
 * documentación, código transferible). Estática y sin íconos: antes era un
 * marquee infinito de 4 ítems repetidos 4 veces, con un pictograma de degradado
 * azul por ítem — movimiento y decoración para decir cuatro frases. Numeradas
 * en mono y separadas por filetes, se leen de una vez.
 */
export function TrustStrip({ locale = defaultLocale }: { locale?: Locale }) {
  const trustData = getTrustContent(locale);

  return (
    <div role="group" aria-label={trustData.ariaLabel} className="w-full border-y border-background/10 bg-foreground">
      <ul
        className={cn(
          "mx-auto grid max-w-6xl divide-y divide-background/10 px-6 sm:grid-cols-2 sm:divide-y-0 lg:divide-x",
          DESKTOP_COLUMNS[trustData.items.length] ?? "lg:grid-cols-4",
        )}
      >
        {trustData.items.map((item, index) => (
          <li
            key={item.label}
            style={{ "--i": index } as CSSProperties}
            className="reveal-up flex items-baseline gap-4 py-5 text-sm leading-snug text-background/80 sm:py-6 sm:last:odd:col-span-2 lg:px-6 lg:first:pl-0 lg:last:pr-0 lg:last:odd:col-span-1"
          >
            <span className="font-mono text-xs text-background/60">{String(index + 1).padStart(2, "0")}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
