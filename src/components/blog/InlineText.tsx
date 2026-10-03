import Link from "next/link";
import { parseInlineLinks } from "@/lib/inlineLinks";

// Sin "use client": funciona igual dentro de ArticleBody (server) y de
// ServiceView (cliente). El enlace se distingue por subrayado, no solo por
// color (WCAG 1.4.1), y no usa el acento — ese queda reservado a sus 2-3
// puntos de contacto (ver CLAUDE.md).
const LINK_CLASSES =
  "rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Texto con enlaces internos `[texto](/ruta)` — ver lib/inlineLinks.ts. */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInlineLinks(text).map((segment, index) =>
        segment.type === "link" ? (
          <Link key={index} href={segment.href} className={LINK_CLASSES}>
            {segment.text}
          </Link>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}
