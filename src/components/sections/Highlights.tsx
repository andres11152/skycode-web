"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getTestimonialsContent } from "@/content/testimonials";
import { getHighlightsContent } from "@/content/highlights";
import { getHeroContent } from "@/content/hero";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { BrainCircuit } from "lucide-react";
import {
  NestJsIcon,
  NextJsIcon,
  PostgreSQLIcon,
  ReactIcon,
  TypeScriptIcon,
} from "@/components/icons/TechIcons";

const techStack = [
  { name: "TypeScript", Icon: TypeScriptIcon },
  { name: "Next.js", Icon: NextJsIcon },
  { name: "React", Icon: ReactIcon },
  { name: "Nest.js / Node", Icon: NestJsIcon },
  { name: "PostgreSQL", Icon: PostgreSQLIcon },
  { name: "IA & Agentes", Icon: BrainCircuit },
];

function VideoShowcase({
  videoAria,
}: {
  videoAria: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // El video pesa ~2.3MB — nunca se descarga hasta que la sección está a punto de
  // entrar en pantalla, para no competir por ancho de banda con el resto del LCP.
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full overflow-hidden rounded-xl bg-foreground transition-all duration-300 hover:border-accent/30"
    >
      <div className="aspect-[4/3] w-full">
        {shouldLoad && (
          <video
            ref={videoRef}
            src="/videos/software-demo.mp4"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            aria-label={videoAria}
          />
        )}
      </div>
    </div>
  );
}

export function Highlights({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const highlightsData = getHighlightsContent(locale);
  const { testimonials } = getTestimonialsContent(locale);
  const featuredTestimonial = testimonials.find((t) => t.featured) ?? testimonials[0];

  return (
    <section aria-label={highlightsData.sectionAria} className="px-6 py-16">
      <h2 className="sr-only">{highlightsData.sectionAria}</h2>
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-8 max-w-4xl"
        >
          <p className="text-base sm:text-lg font-medium text-foreground/80 leading-relaxed">
            {getHeroContent(locale).description}
          </p>
        </motion.div>

        {/* Bento: la tarjeta del testimonio pesa el doble que video/stack, y el
            listado de enfoque ocupa el ancho completo debajo — jerarquía visual
            real en vez de 3 columnas parejas. */}
        <motion.div
          variants={staggerContainer(reduced, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 lg:grid-cols-3"
        >
          <motion.div variants={fadeUp(reduced)} className="lg:col-span-2 lg:row-span-2">
            <SpotlightCard className="h-full" spotlightSize={320}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-foreground/10 bg-background p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg sm:p-10">
                <blockquote className="text-2xl leading-snug font-medium text-balance text-foreground">
                  &ldquo;{featuredTestimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-8">
                  <p className="font-heading text-sm font-semibold text-foreground">
                    {featuredTestimonial.name}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {featuredTestimonial.role}, {featuredTestimonial.company}
                  </p>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div variants={fadeUp(reduced)} className="lg:col-span-1">
            <SpotlightCard className="h-full">
              <div className="h-full rounded-2xl border border-foreground/10 bg-background p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg">
                <VideoShowcase videoAria={highlightsData.videoAria} />
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div variants={fadeUp(reduced)} className="lg:col-span-1">
            <SpotlightCard className="h-full">
              <div className="flex h-full flex-col justify-center rounded-2xl border border-foreground/10 bg-background p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg">
                <p className="text-sm font-medium text-foreground/60">{highlightsData.techLabel}</p>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {techStack.map(({ name, Icon }) => (
                    <li
                      key={name}
                      title={name}
                      className="group relative flex h-11 w-11 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.02] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/30 hover:bg-accent/[0.04] hover:shadow-lg hover:shadow-accent/5"
                    >
                      <Icon
                        className="h-6 w-6 text-foreground/75 transition-all duration-300 ease-out group-hover:scale-110 group-hover:text-accent group-hover:rotate-3"
                        aria-label={name}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div variants={fadeUp(reduced)} className="lg:col-span-3">
            <SpotlightCard>
              <div className="grid gap-6 rounded-2xl border border-foreground/10 bg-background p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
                {highlightsData.items.map((item) => (
                  <div
                    key={item.title}
                    className="group -ml-3 rounded-lg border-l-2 border-transparent py-1 pl-3 transition-colors duration-200 hover:border-accent hover:bg-accent/[0.04]"
                  >
                    <h3 className="font-heading text-lg font-bold text-foreground transition-colors duration-200 group-hover:text-accent-strong">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-foreground/70">{item.description}</p>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
