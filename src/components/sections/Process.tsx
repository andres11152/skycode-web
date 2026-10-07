import type { CSSProperties } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { BogotaLink } from "@/components/bogota/BogotaLink";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getProcessContent } from "@/content/process";
import { defaultLocale, type Locale } from "@/lib/i18n";

/**
 * Proceso en cuatro pasos: columnas numeradas bajo una línea que se dibuja con
 * el scroll (CSS puro, `.scroll-progress-x`). Antes eran cuatro tarjetas con un
 * cuadro azul numerado, una flecha entre ellas y un título que repetía el
 * número ("01" y "1. Charlamos…"). Server Component sin Framer Motion.
 */
export function Process({ locale = defaultLocale }: { locale?: Locale }) {
  const processData = getProcessContent(locale);

  return (
    <section id="proceso" aria-labelledby="process-title" className="scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <SectionEyebrow className="reveal-up mb-4">{processData.badge}</SectionEyebrow>
          <h2
            id="process-title"
            className="text-4xl font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl"
          >
            <RevealText text={processData.title} />
          </h2>
          <p style={{ "--i": 3 } as CSSProperties} className="reveal-up mt-5 text-lg leading-relaxed text-foreground/80">{processData.description}</p>
        </div>

        <div className="relative mt-16">
          <span aria-hidden="true" className="absolute top-0 left-0 h-px w-full bg-foreground/15" />
          <span
            aria-hidden="true"
            className="scroll-progress-x absolute top-0 left-0 h-px w-full bg-foreground motion-reduce:hidden"
          />
          <ol className="grid gap-10 pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {processData.steps.map((step, index) => (
              <li key={step.title} style={{ "--i": index } as CSSProperties} className="scroll-reveal relative flex flex-col gap-3">
                {/* Marcador sobre la línea: se enciende cuando el paso entra en pantalla. */}
                <span aria-hidden="true" className="dot-on absolute -top-[2.35rem] left-0 h-2.5 w-2.5 rounded-full bg-foreground" />
                <span className="font-mono text-sm text-foreground/70">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="text-xl font-semibold tracking-tight text-balance text-foreground">{step.title}</h3>
                <p className="text-base leading-relaxed text-foreground/80">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>

        <BogotaLink locale={locale} className="mt-14" />
      </div>
    </section>
  );
}
