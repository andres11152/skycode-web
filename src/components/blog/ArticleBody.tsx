import type { BlogBlock } from "@/content/blogShared";
import { slugify } from "@/lib/utils";
import { InlineText } from "./InlineText";

export function ArticleBody({ blocks }: { blocks: BlogBlock[] }) {
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
              <pre
                key={index}
                className="overflow-x-auto rounded-xl bg-foreground p-5 font-mono text-[13px] leading-relaxed text-background/90"
              >
                <code>{block.code}</code>
              </pre>
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
