"use client";

import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { useLocale } from "@/components/LocaleProvider";
import { getClosingContent } from "@/content/closing";
import { localeHomePath } from "@/lib/i18n";

/**
 * Lo que se ve (y llega en el HTML del servidor) mientras carga `ClosingStatement`
 * (que es solo cliente por el efecto de scroll). Mantiene la MISMA estructura y
 * altura (`h-[175vh]` con el bloque pegado a la pantalla) y las palabras ya en su
 * opacidad inicial (0,4), así que al montar el real no hay salto de layout ni de
 * contenido: solo empieza a revelarse. Con `prefers-reduced-motion` colapsa al bloque
 * normal, igual que el componente real. Mantener sincronizado con ClosingStatement.tsx.
 */
export function ClosingStatementFallback() {
  const locale = useLocale();
  const data = getClosingContent(locale);
  const homePath = localeHomePath(locale);
  const contactHref = `${homePath === "/" ? "" : homePath}/#contacto`;

  return (
    <section aria-label={data.sectionAria} className="relative h-[175vh] bg-foreground motion-reduce:h-auto motion-reduce:py-28">
      <div className="relative sticky top-0 flex h-screen flex-col items-start justify-center gap-10 overflow-hidden px-6 motion-reduce:static motion-reduce:h-auto motion-reduce:py-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-8">
          <SectionEyebrow onDark>{data.eyebrow}</SectionEyebrow>
          <p className="text-3xl leading-snug font-bold tracking-tight text-balance text-background/40 motion-reduce:text-background sm:text-5xl">
            {data.statement}
          </p>
          <Button href={contactHref} variant="accent" size="lg" className="focus-visible:ring-offset-foreground">
            {data.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
