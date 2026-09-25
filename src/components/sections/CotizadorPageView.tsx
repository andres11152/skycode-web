"use client";

// Página propia del cotizador (/cotizador, /en/cotizador, /fr/cotizador) —
// antes vivía embebido a mitad de la home (ver HomeInteractiveSections.tsx),
// uno de los tramos más largos del scroll de la home (auditoría visual: la
// home entera medía ~13.800px en desktop). La home ahora solo deja una
// tarjeta-teaser que enlaza aquí (ver ProjectEstimatorTeaser.tsx); el
// formulario interactivo completo — con toda su lógica de precios/estado —
// sigue siendo el mismo componente `ProjectEstimator`, sin duplicar nada.

import Link from "next/link";
import { ProjectEstimator } from "./ProjectEstimator";
import { getProjectEstimatorContent } from "@/content/projectEstimator";
import { getNavContent } from "@/content/nav";
import { localeHomePath, type Locale } from "@/lib/i18n";

export function CotizadorPageView({ locale }: { locale: Locale }) {
  const content = getProjectEstimatorContent(locale);
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);

  return (
    <main id="main-content" className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <nav aria-label={content.breadcrumbAria}>
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link
                href={homePath}
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {navData.inicio}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{content.navLabel}</li>
          </ol>
        </nav>
      </div>
      <ProjectEstimator locale={locale} />
    </main>
  );
}
