"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { CaseVisual } from "@/components/portfolio/CaseVisual";
import { portfolioCasePath } from "@/lib/portfolioPaths";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NextCaseData {
  slug: string;
  title: string;
  clientLabel: string;
  coverSrc: string | null;
  coverAlt: string;
  industryIcon: string;
  hostname: string;
}

/**
 * Cierre del caso: el siguiente proyecto a gran tamaño. Su captura comparte el
 * nombre de transición `project-cover-{slug}` con el hero de ese caso, así que
 * el navegador intenta hacer morph hasta él. Es de mejor esfuerzo: React solo
 * empareja elementos visibles en ambos estados y Next puede conservar el scroll
 * al navegar; si no empareja, cae al crossfade normal sin romper nada.
 */
export function NextCase({ next, label, locale }: { next: NextCaseData; label: string; locale: Locale }) {
  return (
    <section aria-label={label} className="mx-auto max-w-6xl px-6">
      <Link
        href={portfolioCasePath(locale, next.slug)}
        className={cn(
          "group grid gap-8 rounded-xl border-t border-foreground/10 py-14 sm:py-20 lg:grid-cols-12 lg:items-end lg:gap-16",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <div className="flex flex-col lg:col-span-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground/70">{label}</p>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-foreground/70">{next.clientLabel}</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-5xl lg:text-6xl">
            {next.title}
          </h2>
          <span
            aria-hidden="true"
            className="mt-8 flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15 transition-colors duration-200 group-hover:border-accent-strong group-hover:bg-accent-strong group-hover:text-accent-foreground"
          >
            <ArrowRight
              size={20}
              className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
            />
          </span>
        </div>

        <div className="lg:col-span-6">
          <CaseVisual
            slug={next.slug}
            imageSrc={next.coverSrc}
            alt={next.coverAlt}
            industryIcon={next.industryIcon}
            url={next.hostname}
            sizes="(max-width: 1024px) 100vw, 560px"
            className="transition-colors duration-300 group-hover:border-foreground/25"
          />
        </div>
      </Link>
    </section>
  );
}
