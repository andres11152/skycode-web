// Teaser de la home hacia /cotizador — Server Component, no dynamic import
// con `ssr: false` como tenía el formulario completo (ProjectEstimator):
// ya no hay estado de wizard que hidratar acá, solo copy + un botón.
//
// El cotizador interactivo completo se movió a su propia ruta (/cotizador,
// /en/cotizador, /fr/cotizador — ver CotizadorPageView.tsx) porque era el
// tramo más largo de la home (auditoría visual: la home medía ~13.800px en
// desktop) y competía por atención con el resto del contenido de venta.
// Este teaser reutiliza el mismo `badge`/`title`/`subtitle` del cotizador
// real — mismo copy, sin duplicarlo en un archivo aparte.

import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getProjectEstimatorContent } from "@/content/projectEstimator";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";

export function ProjectEstimatorTeaser({ locale = defaultLocale }: { locale?: Locale }) {
  const content = getProjectEstimatorContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <section aria-label={content.sectionAria} className="px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start gap-6 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div className="max-w-xl">
            <SectionEyebrow className="mb-3">{content.badge}</SectionEyebrow>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {content.title}
            </h2>
            <p className="mt-3 text-base text-foreground/80 sm:text-lg">{content.subtitle}</p>
          </div>
          <Button href={`${prefix}/cotizador`} variant="accent" size="lg" className="shrink-0">
            {content.teaserCta}
          </Button>
        </div>
      </div>
    </section>
  );
}
