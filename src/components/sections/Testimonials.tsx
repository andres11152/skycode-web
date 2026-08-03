"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play, Quote } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { getTestimonialsContent } from "@/content/testimonials";
import { getUiContent } from "@/content/ui";
import { defaultLocale, t, type Locale } from "@/lib/i18n";

const AUTOPLAY_MS = 7000;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function Testimonials({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const { testimonials, testimonialsSection } = getTestimonialsContent(locale);
  const uiData = getUiContent(locale);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const goTo = useCallback(
    (nextIndex: number) => {
      setDirection(nextIndex > index ? 1 : -1);
      setIndex((nextIndex + testimonials.length) % testimonials.length);
    },
    [index, testimonials.length],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((current) => (current + 1) % testimonials.length);
  }, [testimonials.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((current) => (current - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  // Autoplay se detiene con reduced-motion, al pasar el mouse, con foco de
  // teclado dentro del carrusel, o si el usuario lo pausa explícitamente con
  // el botón (WCAG 2.2.2 — contenido que se autoactualiza necesita un control
  // de pausa persistente, no solo hover).
  useEffect(() => {
    if (reduced || hovering || userPaused || testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % testimonials.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [reduced, hovering, userPaused, testimonials.length]);

  const active = testimonials[index];
  const isAutoplaying = !reduced && !userPaused && testimonials.length > 1;

  return (
    <section
      id="testimonios"
      aria-label={uiData.testimonialsSectionAria}
      className="scroll-mt-24 bg-foreground px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-xl">
          <h2 className="text-4xl font-bold tracking-tight text-background sm:text-5xl">
            {testimonialsSection.title}
          </h2>
          <p className="mt-3 text-background/80">{testimonialsSection.description}</p>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={testimonialsSection.title}
          aria-live="polite"
          tabIndex={0}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setHovering(true)}
          onBlur={() => setHovering(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goNext();
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              goPrev();
            }
          }}
          className="relative mx-auto max-w-3xl rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          <SpotlightCard spotlightSize={360}>
            <motion.div
              layout
              className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.name}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -32 }}
                  transition={{ duration: reduced ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center px-8 py-12 text-center sm:px-14 sm:py-16"
                >
                  <Quote className="text-accent/40" size={36} aria-hidden="true" />
                  <blockquote className="mt-6 max-w-2xl text-xl leading-snug font-medium text-balance text-foreground sm:text-2xl">
                    &ldquo;{active.quote}&rdquo;
                  </blockquote>
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 font-heading text-base font-semibold text-accent-strong"
                    >
                      {initials(active.name)}
                    </span>
                    <div>
                      <p className="font-heading text-sm font-semibold text-foreground">{active.name}</p>
                      <p className="text-sm text-foreground/60">
                        {active.role}, {active.company}
                        {active.location ? ` · ${active.location}` : ""}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </SpotlightCard>

          {testimonials.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label={uiData.testimonialsScrollPrev}
                className="absolute left-0 top-1/2 z-30 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-background/15 bg-foreground text-background transition-colors hover:bg-background/10 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:flex"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label={uiData.testimonialsScrollNext}
                className="absolute right-0 top-1/2 z-30 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-background/15 bg-foreground text-background transition-colors hover:bg-background/10 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:flex"
              >
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>

        {testimonials.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setUserPaused((value) => !value)}
              aria-label={isAutoplaying ? uiData.testimonialsPause : uiData.testimonialsResume}
              className="flex h-8 w-8 items-center justify-center rounded-full text-background/50 outline-none transition-colors hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              {isAutoplaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="flex gap-2">
              {testimonials.map((testimonial, i) => (
                <button
                  key={testimonial.name}
                  onClick={() => goTo(i)}
                  className="group flex h-6 w-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  aria-label={t(uiData.testimonialsGoToSlide, { index: String(i + 1) })}
                >
                  <motion.div
                    animate={{
                      width: index === i ? 24 : 8,
                      backgroundColor: index === i ? "var(--accent-secondary)" : "rgba(255, 255, 255, 0.25)",
                    }}
                    transition={reduced ? { duration: 0.01 } : { type: "spring", stiffness: 300, damping: 30 }}
                    className="h-2 rounded-full transition-colors group-hover:bg-background/40"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
