"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GridPattern } from "@/components/ui/GridPattern";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { GradientShimmer } from "@/components/ui/gradient-shimmer";
import { getHeroContent } from "@/content/hero";
import { defaultLocale, type Locale } from "@/lib/i18n";

// ─── CodeMockup ────────────────────────────────────────────────────────────────
// El panel decorativo de código del Hero.
//
// Cambios de rendimiento para mobile (LCP / main thread):
//  1. Se eliminó el 3D-tilt (useMotionValue + useTransform) — en dispositivos
//     táctiles no funciona y costaba 2 MotionValues + 2 transforms por frame.
//  2. La animación de float pasó de `motion.animate` a CSS @keyframes
//     (ver globals.css .animate-float) — corre 100% en el compositor de GPU
//     sin trabajo de JS en el main thread.
//  3. Los motion.div del typing-animation se mantienen: son purely decorativos,
//     empiezan 0.5 s después del LCP y no bloquean el paint inicial.
function CodeMockup({ locale }: { locale: Locale }) {
  const { comment } = getHeroContent(locale).codeMockup;
  const reduced = Boolean(useReducedMotion());

  const codeLines: { length: number; isBreak?: boolean; jsx: React.ReactNode }[] = [
    {
      // La duración del "tipeo" depende de esto — se deriva del string real
      // (no un número fijo) porque el comentario cambia de largo por idioma.
      length: comment.length,
      jsx: <span className="text-background/60">{comment}</span>,
    },
    {
      length: 29,
      jsx: (
        <>
          <span className="text-accent">import</span>
          <span className="text-background/80">{" { z } "}</span>
          <span className="text-accent">from</span>
          <span className="text-background/80">{" \"zod\";"}</span>
        </>
      ),
    },
    {
      length: 44,
      jsx: (
        <>
          <span className="text-accent">import</span>
          <span className="text-background/80">{" { requireAuth } "}</span>
          <span className="text-accent">from</span>
          <span className="text-background/80">{" \"@/lib/auth\";"}</span>
        </>
      ),
    },
    {
      length: 1,
      isBreak: true,
      jsx: <span className="text-background/20">{"\n"}</span>,
    },
    {
      length: 28,
      jsx: (
        <>
          <span className="text-accent">const</span>
          <span className="text-background/80">{" OrderSchema = z.object({"}</span>
        </>
      ),
    },
    {
      length: 38,
      jsx: (
        <>
          <span className="pl-4">
            <span className="text-accent">{"productId"}</span>
            <span className="text-background/80">{": z.string().uuid(),"}</span>
          </span>
        </>
      ),
    },
    {
      length: 31,
      jsx: (
        <>
          <span className="pl-4">
            <span className="text-accent">{"qty"}</span>
            <span className="text-background/80">{": z.number().int().min(1),"}</span>
          </span>
        </>
      ),
    },
    {
      length: 2,
      jsx: <span className="text-background/80">{"});"}</span>,
    },
    {
      length: 1,
      isBreak: true,
      jsx: <span className="text-background/20">{"\n"}</span>,
    },
    {
      length: 50,
      jsx: (
        <>
          <span className="text-accent">export</span>
          <span className="text-background/80">{" async function POST(req: Request) {"}</span>
        </>
      ),
    },
    {
      length: 36,
      jsx: (
        <>
          <span className="pl-4">
            <span className="text-accent">const</span>
            <span className="text-background/80">{" user = await requireAuth(req);"}</span>
          </span>
        </>
      ),
    },
    {
      length: 52,
      jsx: (
        <>
          <span className="pl-4">
            <span className="text-accent">const</span>
            <span className="text-background/80">{" body = OrderSchema.parse(await req.json());"}</span>
          </span>
        </>
      ),
    },
    {
      length: 1,
      isBreak: true,
      jsx: <span className="text-background/20">{"\n"}</span>,
    },
    {
      length: 41,
      jsx: (
        <>
          <span className="pl-4">
            <span className="text-accent">const</span>
            <span className="text-background/80">{" order = "}</span>
            <span className="text-accent">await</span>
            <span className="text-background/80">{" db.orders.create({"}</span>
          </span>
        </>
      ),
    },
    {
      length: 42,
      jsx: <span className="pl-8 text-background/80">{"data: { ...body, ownerId: user.id },"}</span>,
    },
    {
      length: 9,
      jsx: <span className="pl-4 text-background/80">{"});"}</span>,
    },
    {
      length: 1,
      isBreak: true,
      jsx: <span className="text-background/20">{"\n"}</span>,
    },
    {
      length: 50,
      jsx: (
        <>
          <span className="pl-4">
            <span className="text-accent">return</span>
            <span className="text-background/80">{" Response.json(order, { status: "}</span>
            <span className="text-accent">201</span>
            <span className="text-background/80">{" });"}</span>
          </span>
        </>
      ),
    },
    {
      length: 1,
      jsx: <span className="text-background/80">{"}"}</span>,
    },
  ];

  let currentDelay = 0.5;
  const linesWithDelays = codeLines.map((line) => {
    const delay = currentDelay;
    const duration = line.length * 0.022; // velocidad: 22ms por carácter
    currentDelay += duration + 0.1; // pausa de 100ms entre líneas
    return { ...line, delay, duration };
  });

  const [status, setStatus] = useState(reduced ? "success" : "loading");

  useEffect(() => {
    if (reduced) return;
    const timer = setTimeout(() => {
      setStatus("success");
    }, Math.round(currentDelay * 1000));
    return () => clearTimeout(timer);
  }, [currentDelay, reduced]);

  return (
    // Float: CSS @keyframes animate-float (globals.css) — GPU compositor,
    // sin JS, sin Framer Motion. El tilt 3D fue eliminado (no funciona en
    // táctil y costaba 2 MotionValues + useTransform en el main thread).
    <div
      className={`w-full max-w-md select-none ${!reduced ? "animate-float" : ""}`}
    >
      <div
        className="group relative w-full overflow-hidden rounded-xl bg-foreground border border-background/10 shadow-2xl shadow-black/40 transition-all duration-300 hover:shadow-accent/5 hover:border-accent/20"
      >
        {/* Línea de escaneo láser que barre el código — acelerada 100% por GPU */}
        {!reduced && (
          <div
            className="animate-laser absolute inset-x-0 z-20 h-[1.5px] bg-gradient-to-r from-transparent via-accent/80 to-transparent blur-[1px] pointer-events-none"
          />
        )}


        {/* Cabecera del archivo */}
        <div className="flex items-center justify-between border-b border-background/10 px-3 py-2 sm:px-4 sm:py-2.5 bg-background/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1 sm:gap-1.5">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
            </div>
            <span className="font-mono text-[10px] sm:text-xs text-background/60">
              api/orders/route.ts
            </span>
          </div>
          {/* Badge de estado de la API */}
          <div
            className={`hidden xs:flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-semibold transition-colors ${
              status === "success" ? "border-accent/30 text-accent" : "border-background/20 text-background/60"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status === "success" ? "bg-accent" : "bg-background/40"}`} />
            {status === "success" ? "201 Created" : "POSTing..."}
          </div>
        </div>

        {/* Cuerpo del código con efecto typing */}
        <pre className="overflow-x-auto p-3 sm:p-4 font-mono text-[11px] xs:text-[12px] sm:text-[12.5px] leading-normal w-full max-w-full">
          <code className="flex flex-col text-left">
            {linesWithDelays.map((line, index) => {
              if (line.isBreak) {
                return <span key={index} className="text-background/20">{"\n"}</span>;
              }
              if (reduced) {
                return (
                  <div key={index} className="whitespace-nowrap text-left flex items-center pr-1">
                    {line.jsx}
                  </div>
                );
              }

              return (
                <motion.div
                  key={index}
                  initial={{ width: 0, borderRight: "2px solid transparent" }}
                  animate={{
                    width: "100%",
                    borderRight: [
                      "2px solid transparent",
                      "2px solid var(--accent)",
                      "2px solid var(--accent)",
                      "2px solid transparent",
                    ],
                  }}
                  transition={{
                    width: { duration: line.duration, ease: "linear", delay: line.delay },
                    borderRight: {
                      duration: line.duration,
                      times: [0, 0.05, 0.95, 1],
                      delay: line.delay,
                    },
                  }}
                  className="overflow-hidden whitespace-nowrap text-left flex items-center pr-1"
                  style={{ maxWidth: "max-content" }}
                >
                  {line.jsx}
                </motion.div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────────
export function Hero({ locale = defaultLocale }: { locale?: Locale }) {
  const heroData = getHeroContent(locale);

  return (
    <section
      id="inicio"
      aria-label={heroData.sectionAria}
      className="relative overflow-hidden scroll-mt-24 px-6 pt-24 pb-10 sm:pt-28 sm:pb-10 lg:flex lg:flex-1 lg:items-center lg:py-8"
    >
      {/* Resplandor ambiental — un solo glow de acento, no dos (ver CLAUDE.md: el amarillo
          se reserva para el punto del Footer). */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 h-[460px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[100px]"
      />
      <GridPattern
        width={40}
        height={40}
        numSquares={40}
        className="[mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,white,transparent)] opacity-95"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-10 xl:gap-16">
        <div className="flex flex-col items-start gap-3 text-left">
          <SectionEyebrow className="animate-hero-fade-up mb-2">{heroData.badge}</SectionEyebrow>

          <GradientShimmer
            as="h1"
            gradient={[
              { color: "#0089CD", position: 0 },
              { color: "#38BDF8", position: 0.3 },
              { color: "#7DD3FC", position: 0.5 },
              { color: "#38BDF8", position: 0.7 },
              { color: "#0089CD", position: 1 },
            ]}
            angle={125}
            duration={2.5}
            spread={4}
            pauseBetween={1200}
            className="animate-hero-fade-up text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "0.1s" }}
          >
            {heroData.title}
          </GradientShimmer>

          <p
            className="animate-hero-fade-up max-w-xl text-lg font-medium text-foreground/80"
            style={{ animationDelay: "0.2s" }}
          >
            {heroData.subtitle}
          </p>

          {/*
           * CTAs: se eliminaron los <motion.div whileHover/whileTap> — Framer Motion
           * requiere hidratación + event listeners por cada botón. En su lugar,
           * .hero-cta en globals.css usa CSS :hover y :active con transform:scale(),
           * que corre en el compositor de GPU sin ningún JS en el main thread.
           */}
          <div
            role="group"
            aria-label={heroData.actionsAria}
            className="animate-hero-fade-up mt-2 flex flex-col gap-4 sm:flex-row"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="hero-cta inline-flex">
              <Button
                href={heroData.ctaPrimary.href}
                variant="accent"
                size="lg"
                aria-label={heroData.ctaPrimary.ariaLabel}
              >
                {heroData.ctaPrimary.label}
              </Button>
            </div>

            <div className="hero-cta inline-flex">
              <Button
                href={heroData.ctaSecondary.href}
                variant="secondary"
                size="lg"
                aria-label={heroData.ctaSecondary.ariaLabel}
              >
                {heroData.ctaSecondary.label}
              </Button>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="animate-hero-scale-in flex justify-center lg:mt-16 lg:justify-end w-full max-w-full overflow-hidden"
        >
          <CodeMockup locale={locale} />
        </div>
      </div>
    </section>
  );
}
