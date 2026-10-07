import type { CSSProperties } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { ServicesExplorer } from "@/components/services/ServicesExplorer";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getServicePageContent } from "@/content/servicePage";
import { getServicesContent } from "@/content/services";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";

/**
 * Servicios en la home: el mismo índice con vista previa que `/servicios`
 * (lista numerada y, en escritorio, un panel que muestra la demo del servicio
 * activo). Antes era un carrusel horizontal que escondía 6 de los 9 servicios
 * detrás de unas flechas, con nueve widgets animados importados de golpe.
 * Server Component: solo `ServicesExplorer` es isla cliente, y sus demos se
 * cargan diferidas y solo en escritorio.
 */
export function Services({ locale = defaultLocale }: { locale?: Locale }) {
  const { servicesSection } = getServicesContent(locale);
  const { index } = getServicePageContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <section id="servicios" className="scroll-mt-24 border-y border-foreground/10 bg-foreground/[0.03] px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow className="reveal-blur mb-4">{servicesSection.badge}</SectionEyebrow>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
              <RevealText text={servicesSection.title} />
            </h2>
            <p style={{ "--i": 3 } as CSSProperties} className="reveal-blur mt-5 text-lg leading-relaxed text-foreground/80">{servicesSection.description}</p>
          </div>
          <div className="shrink-0">
            <Button href={`${prefix}/servicios`} variant="secondary" size="md">
              {servicesSection.viewAll}
            </Button>
          </div>
        </div>

        <ServicesExplorer
          locale={locale}
          headingLevel="h3"
          copy={{ listAria: index.listAria, previewLabel: index.previewLabel, openService: index.openService }}
        />
      </div>
    </section>
  );
}
