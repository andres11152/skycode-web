"use client";

import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { getErrorsContent } from "@/content/errors";
import { localeHomePath } from "@/lib/i18n";

export default function NotFound() {
  const locale = useLocale();
  const content = getErrorsContent(locale).notFound;
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <main id="main-content" className="flex min-h-[70vh] items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.02] text-accent">
          <Compass size={26} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground/50">
          {content.eyebrow}
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-3 text-foreground/80 leading-relaxed">{content.description}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={homePath}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-strong px-6 text-sm font-semibold text-accent-foreground outline-none transition-colors hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {content.ctaHome}
            <ArrowRight size={16} />
          </Link>
          <Link
            href={`${prefix}/#contacto`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foreground/15 px-6 text-sm font-semibold text-foreground/80 outline-none transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {content.ctaContact}
          </Link>
        </div>
      </div>
    </main>
  );
}
