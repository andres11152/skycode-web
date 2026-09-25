"use client";

import { useEffect, useRef, useState } from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { getHighlightsContent } from "@/content/highlights";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { Magnetic } from "@/components/ui/Magnetic";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { Brain } from "@phosphor-icons/react";
import {
  FlutterIcon,
  JavaScriptIcon,
  LaravelIcon,
  MongoDBIcon,
  NestJsIcon,
  NextJsIcon,
  PhpIcon,
  PostgreSQLIcon,
  ReactIcon,
  TailwindCSSIcon,
  TypeScriptIcon,
  WordPressIcon,
} from "@/components/icons/TechIcons";

const techStack = [
  { name: "TypeScript", Icon: TypeScriptIcon },
  { name: "JavaScript", Icon: JavaScriptIcon },
  { name: "Next.js", Icon: NextJsIcon },
  { name: "React", Icon: ReactIcon },
  { name: "Laravel", Icon: LaravelIcon },
  { name: "PHP", Icon: PhpIcon },
  { name: "WordPress", Icon: WordPressIcon },
  // React Native usa oficialmente el mismo logo átomo de React (confirmado en
  // simpleicons.org — no existe un ícono "reactnative" separado).
  { name: "React Native", Icon: ReactIcon },
  { name: "Flutter", Icon: FlutterIcon },
  { name: "Tailwind CSS", Icon: TailwindCSSIcon },
  { name: "Nest.js / Node", Icon: NestJsIcon },
  { name: "PostgreSQL", Icon: PostgreSQLIcon },
  { name: "MongoDB", Icon: MongoDBIcon },
  { name: "IA & Agentes", Icon: Brain },
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
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);

  return (
    <section aria-label={highlightsData.sectionAria} className="px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-12 max-w-4xl"
        >
          <SectionEyebrow className="mb-3">{highlightsData.badge}</SectionEyebrow>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {highlightsData.title}
          </h2>
          <p className="mt-3 text-base sm:text-lg font-medium text-foreground/80 leading-relaxed">
            {highlightsData.description}
          </p>
        </motion.div>

        {/* Bento de 2 columnas: video + stack arriba (mismo peso visual), el
            listado de diferenciadores ocupa el ancho completo debajo. */}
        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 lg:grid-cols-2"
        >
          <motion.div variants={fadeUp(reduced)}>
            <SpotlightCard className="h-full">
              <div className="relative overflow-hidden h-full rounded-xl border border-foreground/10 bg-background p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg">
                <BorderBeam size={260} duration={12} borderWidth={1.5} colorFrom="#0089cd" colorTo="#006998" />
                <VideoShowcase videoAria={highlightsData.videoAria} />
              </div>
            </SpotlightCard>
          </motion.div>

          {/* self-start: por defecto CSS Grid estira ambas celdas de la fila a
              la altura de la más alta (el video, por su aspect-[4/3]) — esta
              tarjeta terminaba con ~280px de relleno vacío arriba y abajo de
              2 filas de iconos centradas dentro de una caja mucho más alta
              que su contenido. Con self-start, la tarjeta toma su altura
              natural y queda alineada arriba; el resto de la fila queda como
              espacio de página normal, no como una caja vacía con borde. */}
          <motion.div variants={fadeUp(reduced)} className="self-start">
            <SpotlightCard>
              <div className="rounded-xl border border-foreground/10 bg-background p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg">
                <p className="text-sm font-medium text-foreground/60">{highlightsData.techLabel}</p>
                {/* grid adaptable de iconos con soporte de tooltip pill estrictamente único en hover */}
                <ul className="mt-8 grid w-fit grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3">
                  {techStack.map(({ name, Icon }) => {
                    const isHovered = hoveredTech === name;
                    return (
                      // <li> debe ser hijo directo de <ul> para que los
                      // lectores de pantalla anuncien la lista correctamente
                      // (bug real de Lighthouse: `<Magnetic>` como hijo
                      // directo del `<ul>` renderiza un `<div>` envolvente,
                      // rompiendo esa relación) — `Magnetic` ahora envuelve
                      // solo el ícono/tooltip, no la caja completa del `<li>`.
                      <li
                        key={name}
                        tabIndex={0}
                        onMouseEnter={() => setHoveredTech(name)}
                        onMouseLeave={() => setHoveredTech(null)}
                        onFocus={() => setHoveredTech(name)}
                        onBlur={() => setHoveredTech(null)}
                        className="group relative flex h-14 w-14 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.02] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/40 hover:bg-accent/[0.06] hover:shadow-lg hover:shadow-accent/10 focus:outline-none focus:ring-2 focus:ring-accent hover:z-30 focus-visible:z-30"
                      >
                        <Magnetic strength={0.25} range={40}>
                          <Icon
                            className="h-7 w-7 text-foreground/75 transition-all duration-300 ease-out group-hover:scale-110 group-hover:text-accent group-hover:rotate-3"
                            aria-label={name}
                          />
                        </Magnetic>

                        {/* Tooltip Pill: solo se renderiza y muestra cuando este elemento específico es el hoveredTech */}
                        {isHovered && (
                          <span className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 flex items-center z-50 whitespace-nowrap rounded-full border border-accent/30 bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-md shadow-accent/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                            {name}
                            {/* Triángulo inferior del indicador */}
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-accent/40" />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div variants={fadeUp(reduced)} className="lg:col-span-2">
            <SpotlightCard>
              {/* divide-y: en mobile (una sola columna) marca cada ítem con una
                  línea sutil en vez de tres tarjetas separadas con su propio
                  padding — mismo contenido, la mitad del scroll. Desde sm: se
                  vuelven 3 columnas propias, sin divisores. */}
              <div className="grid divide-y divide-foreground/10 rounded-xl border border-foreground/10 bg-background p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-lg sm:grid-cols-3 sm:gap-6 sm:divide-y-0 sm:p-10">
                {highlightsData.items.map((item) => (
                  <div key={item.title} className="group flex items-start gap-4 py-6 first:pt-0 last:pb-0 sm:block sm:gap-0 sm:py-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-foreground/5 to-foreground/[0.01] border border-foreground/10 text-foreground/60 transition-all duration-300 group-hover:from-accent/15 group-hover:to-accent/5 group-hover:border-accent/30 group-hover:text-accent">
                      <item.icon size={22} weight="duotone" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 sm:mt-4">
                      <h3 className="font-heading text-base font-bold text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/70 leading-relaxed sm:mt-1.5">{item.description}</p>
                    </div>
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
