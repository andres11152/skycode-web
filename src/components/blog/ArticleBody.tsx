import type { BlogBlock } from "@/content/blogShared";
import { cn, slugify } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import { InlineText } from "./InlineText";

export function ArticleBody({
  blocks,
  copyCodeLabel,
  copiedCodeLabel,
  editorial = false,
}: {
  blocks: BlogBlock[];
  /**
   * Composición de lectura larga para artículos: entradilla en el primer
   * párrafo y escala más grande. Los documentos legales
   * (`LegalDocumentView`) no lo activan y conservan la escala compacta.
   */
  editorial?: boolean;
  /** Si faltan, los bloques de código no muestran botón de copiar (ej. documentos legales, que no llevan código). */
  copyCodeLabel?: string;
  copiedCodeLabel?: string;
}) {
  return (
    <div className={cn("flex flex-col", editorial ? "gap-6" : "gap-5")}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={index}
                className={
                  editorial
                    ? index === 0
                      ? "text-xl leading-9 text-foreground"
                      : "text-lg leading-8 text-foreground/80"
                    : "text-base leading-relaxed text-foreground/80"
                }
              >
                <InlineText text={block.text} />
              </p>
            );
          case "heading":
            return block.level === 2 ? (
              <h2
                key={index}
                id={slugify(block.text)}
                className={cn("scroll-mt-24 font-bold tracking-tight text-foreground", editorial ? "mt-10 text-3xl text-balance" : "mt-4 text-2xl")}
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={index}
                id={slugify(block.text)}
                className={cn("scroll-mt-24 font-semibold tracking-tight text-foreground", editorial ? "mt-4 text-xl" : "mt-2 text-xl")}
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
                    className={cn("flex gap-3 text-foreground/80", editorial ? "text-lg leading-8" : "text-base leading-relaxed")}
                  >
                    <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-accent", editorial ? "mt-3.5" : "mt-2.5")} />
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "code":
            return (
              <div key={index} className="overflow-hidden rounded-xl bg-foreground">
                {/* Cabecera con el lenguaje y el botón de copiar (siempre visible: en táctil no hay hover). */}
                <div className="flex h-11 items-center justify-between border-b border-background/10 pr-1.5 pl-5">
                  <span className="font-mono text-xs font-medium tracking-[0.15em] text-background/70 uppercase">
                    {block.language}
                  </span>
                  {copyCodeLabel && copiedCodeLabel && (
                    <CopyButton
                      value={block.code}
                      label={copyCodeLabel}
                      copiedLabel={copiedCodeLabel}
                      className="text-background/70 hover:bg-background/10 hover:text-background focus-visible:ring-offset-foreground"
                    />
                  )}
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-background/90">
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          case "faq":
            return (
              <div key={index} className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
                {block.items.map((item) => (
                  <div key={item.question} className={cn("flex flex-col gap-2", editorial ? "py-6" : "py-5")}>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.question}</h3>
                    <p className={cn("text-foreground/80", editorial ? "text-lg leading-8" : "text-base leading-relaxed")}>
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
