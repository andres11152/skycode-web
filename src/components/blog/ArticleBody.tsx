import type { BlogBlock } from "@/content/blogShared";
import { slugify } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import { InlineText } from "./InlineText";

export function ArticleBody({
  blocks,
  copyCodeLabel,
  copiedCodeLabel,
}: {
  blocks: BlogBlock[];
  /** Si faltan, los bloques de código no muestran botón de copiar (ej. documentos legales, que no llevan código). */
  copyCodeLabel?: string;
  copiedCodeLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={index}
                className="text-base leading-relaxed text-foreground/80"
              >
                <InlineText text={block.text} />
              </p>
            );
          case "heading":
            return block.level === 2 ? (
              <h2
                key={index}
                id={slugify(block.text)}
                className="mt-4 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground"
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={index}
                id={slugify(block.text)}
                className="mt-2 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground"
              >
                {block.text}
              </h3>
            );
          case "list":
            return (
              <ul key={index} className="flex flex-col gap-2">
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-base leading-relaxed text-foreground/80"
                  >
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "code":
            return (
              <div key={index} className="group/code relative">
                <pre className="overflow-x-auto rounded-xl bg-foreground p-5 pr-14 font-mono text-[13px] leading-relaxed text-background/90">
                  <code>{block.code}</code>
                </pre>
                {/* Visible siempre en táctil (no hay hover) y al hover/foco en
                    escritorio; tonos claros sobre el bloque oscuro. */}
                {copyCodeLabel && copiedCodeLabel && (
                <CopyButton
                  value={block.code}
                  label={copyCodeLabel}
                  copiedLabel={copiedCodeLabel}
                  className="absolute right-1.5 top-1.5 text-background/70 hover:bg-background/10 hover:text-background focus-visible:ring-offset-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/code:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 transition-[opacity,background-color,color]"
                />
                )}
              </div>
            );
          case "faq":
            return (
              <div key={index} className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
                {block.items.map((item) => (
                  <div key={item.question} className="flex flex-col gap-2 py-5">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.question}</h3>
                    <p className="text-base leading-relaxed text-foreground/80">
                      <InlineText text={item.answer} />
                    </p>
                  </div>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
