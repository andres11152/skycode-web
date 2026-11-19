"use client";

import { useRef, type ReactNode } from "react";
import { m as motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { cn } from "@/lib/utils";
import { getClosingContent } from "@/content/closing";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";
import { Magnetic } from "@/components/ui/Magnetic";
import { BrandPeriod } from "@/components/ui/BrandPeriod";

function RevealWord({
  word,
  index,
  total,
  progress,
  trailing,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  /** Lo que sigue pegado a la palabra y se revela con ella (el punto de marca de la última). */
  trailing?: ReactNode;
}) {
  const start = (index / total) * 0.7;
  const end = Math.min(start + 0.3, 1);
  // Piso de opacidad 0.5: el texto aún sin revelar es negro al 50% sobre la banda amarilla, ~3,4:1,
  // por encima del 3:1 de WCAG para texto grande (al 0.4 de antes daría 2,6:1 sobre amarillo).
  // Lo verifica themeContrast.test.ts. Mantener igual en ClosingStatementFallback.
  const opacity = useTransform(progress, [start, end], [0.5, 1]);

  return (
    <motion.span style={{ opacity }} className="mr-[0.28em] inline-block">
      {word}
      {trailing}
    </motion.span>
  );
}

export function ClosingStatement({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const closingData = getClosingContent(locale);
  const words = closingData.statementBody.split(" ");
  const homePath = localeHomePath(locale);
  const contactHref = `${homePath === "/" ? "" : homePath}/#contacto`;
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      aria-label={closingData.sectionAria}
      ref={containerRef}
      className={cn("relative band-yellow", reduced ? "py-28" : "h-[175vh]")}
    >
      <div
        className={cn(
          "relative flex flex-col items-start gap-10 overflow-hidden px-6",
          reduced ? "py-4" : "sticky top-0 h-screen justify-center",
        )}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-8">
          <SectionEyebrow onDark>{closingData.eyebrow}</SectionEyebrow>

          {reduced ? (
            <p className="text-3xl font-bold leading-snug tracking-tight text-balance text-on-inverse sm:text-5xl">
              {closingData.statementBody}
              {closingData.endsWithPeriod && <BrandPeriod />}
            </p>
          ) : (
            <p className="text-3xl font-bold leading-snug tracking-tight text-balance text-on-inverse sm:text-5xl">
              {words.map((word, index) => (
                <RevealWord
                  key={`${word}-${index}`}
                  word={word}
                  index={index}
                  total={words.length}
                  progress={scrollYProgress}
                  trailing={index === words.length - 1 && closingData.endsWithPeriod ? <BrandPeriod /> : undefined}
                />
              ))}
            </p>
          )}

          <Magnetic strength={0.3} range={80}>
            <Button
              href={contactHref}
              variant="accent"
              size="lg"
              className="focus-visible:ring-offset-inverse"
            >
              {closingData.cta}
            </Button>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
