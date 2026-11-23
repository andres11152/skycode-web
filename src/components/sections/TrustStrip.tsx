import type { CSSProperties } from "react";
import { getTrustContent } from "@/content/trust";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { CountUp } from "@/components/ui/CountUp";

/**
 * "Barra de pruebas" bajo el Hero: una tarjeta neutra (superficie elevada, filete fino, sombra casi
 * imperceptible) con los compromisos que ya están publicados. Antes era una banda amarilla de borde a
 * borde: a ese tamaño el amarillo saturado le robaba la mirada al H1 y al CTA, y ahora es solo firma.
 * El amarillo aparece en dos marcas pequeñas: un trazo bajo cada cifra, que se dibuja con el scroll
 * (`.scroll-progress-x`, CSS puro, en su estado final con reduced motion), y el punto del logo
 * (`bg-brand-dot`) antes de cada claim secundario. Las cifras cuentan al entrar en pantalla (`CountUp`,
 * el HTML ya trae el valor final). En móvil, cada cifra va en su fila con la etiqueta a la derecha.
 */
export function TrustStrip({ locale = defaultLocale }: { locale?: Locale }) {
  const trustData = getTrustContent(locale);
  const stats = trustData.items.filter((item) => item.stat !== undefined);
  const claims = trustData.items.filter((item) => item.stat === undefined);

  return (
    <div role="group" aria-label={trustData.ariaLabel} className="w-full px-6 pb-10 sm:pb-14">
      <div className="mx-auto max-w-6xl rounded-xl border border-foreground/10 bg-surface-raised shadow-lg shadow-black/[0.03]">
        <ul className="grid grid-cols-1 divide-y divide-foreground/10 px-6 sm:px-8 lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:px-0">
          {stats.map((item, index) => (
            <li
              key={item.label}
              style={{ "--i": index } as CSSProperties}
              className="reveal-up flex items-center gap-5 py-6 lg:flex-col lg:items-start lg:gap-4 lg:px-10 lg:py-9"
            >
              <span className="flex min-w-[8.5rem] flex-col gap-3 sm:min-w-[11rem] lg:min-w-0">
                <CountUp
                  value={item.stat as number}
                  suffix={item.unit}
                  className="text-4xl leading-none font-semibold tracking-[-0.04em] whitespace-nowrap text-foreground sm:text-5xl"
                />
                <span aria-hidden="true" className="scroll-progress-x block h-[3px] w-8 rounded-full bg-accent-secondary" />
              </span>
              <span className="max-w-[15rem] text-sm leading-relaxed text-foreground/80">{item.statLabel}</span>
            </li>
          ))}
        </ul>
        {claims.length > 0 && (
          <ul className="flex flex-col gap-2.5 border-t border-foreground/10 px-6 py-5 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:px-8 lg:px-10">
            {claims.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-foreground/80">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand-dot" />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
