import Link from "next/link";
import { EsBadge } from "@/components/ui/EsBadge";
import { getProcessContent } from "@/content/process";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Enlace contextual a la página local de Bogotá ("¿Tu empresa está en Bogotá…?").
 * Reutiliza el copy de `process.json` (`localPage`, ya traducido a los 3
 * idiomas) para no mantener dos redacciones. La página es solo en español:
 * fuera de `es` el enlace lleva la insignia ES.
 */
export function BogotaLink({ locale, className }: { locale: Locale; className?: string }) {
  const { localPage } = getProcessContent(locale);
  return (
    <p className={cn("max-w-2xl text-base leading-relaxed text-foreground/80", className)}>
      {localPage.text}{" "}
      <Link
        href={bogotaPagePath}
        className="link-underline inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {localPage.linkLabel}
        {locale !== "es" && <EsBadge />}
      </Link>
    </p>
  );
}
