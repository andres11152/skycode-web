import Link from "next/link";
import type { LegalDocument } from "@/content/legal";
import { formatDate } from "@/lib/utils";
import { ArticleBody } from "@/components/blog/ArticleBody";

const linkClasses =
  "rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <main id="main-content" className="px-6 pt-40 pb-24 sm:pt-48 sm:pb-32">
      <article className="mx-auto flex max-w-2xl flex-col gap-8">
        <nav aria-label="Ruta de navegación">
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link href="/" className={linkClasses}>
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground/80">{doc.title}</li>
          </ol>
        </nav>

        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
            {doc.title}
          </h1>
          <p className="text-sm text-foreground/60">
            Última actualización: <time dateTime={doc.updatedAt}>{formatDate(doc.updatedAt)}</time>
          </p>
        </header>

        <ArticleBody blocks={doc.content} />
      </article>
    </main>
  );
}
