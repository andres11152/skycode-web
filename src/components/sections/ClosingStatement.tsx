"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { cn } from "@/lib/utils";
import { getClosingContent } from "@/content/closing";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";
import { Magnetic } from "@/components/ui/Magnetic";

function RevealWord({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = (index / total) * 0.7;
  const end = Math.min(start + 0.3, 1);
  // Piso de opacidad 0.4 (no 0.15): a 0.15 el texto "dim" cae a un contraste de 1.47:1
  // contra el fondo negro — por debajo del mínimo 3:1 de WCAG para texto grande. En 0.4
  // el contraste es ~3.8:1, cumple, y el efecto de revelado sigue siendo visible.
  const opacity = useTransform(progress, [start, end], [0.4, 1]);

  return (
    <motion.span style={{ opacity }} className="mr-[0.28em] inline-block">
      {word}
    </motion.span>
  );
}

export function ClosingStatement({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const closingData = getClosingContent(locale);
  const words = closingData.statement.split(" ");
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
      className={cn("relative bg-foreground", reduced ? "py-28" : "h-[175vh]")}
    >
      <div
        className={cn(
          "relative flex flex-col items-start gap-10 overflow-hidden px-6",
          reduced ? "py-4" : "sticky top-0 h-screen justify-center",
        )}
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.16] blur-[130px]"
        />

        <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-8">
          <SectionEyebrow onDark>{closingData.eyebrow}</SectionEyebrow>

          {reduced ? (
            <p className="text-3xl font-bold leading-snug tracking-tight text-balance text-background sm:text-5xl">
              {closingData.statement}
            </p>
          ) : (
            <p className="text-3xl font-bold leading-snug tracking-tight text-balance text-background sm:text-5xl">
              {words.map((word, index) => (
                <RevealWord
                  key={`${word}-${index}`}
                  word={word}
                  index={index}
                  total={words.length}
                  progress={scrollYProgress}
                />
              ))}
            </p>
          )}

          <Magnetic strength={0.3} range={80}>
            <Button
              href={contactHref}
              variant="accent"
              size="lg"
              className="focus-visible:ring-offset-foreground"
            >
              {closingData.cta}
              <ArrowRight size={16} />
            </Button>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
