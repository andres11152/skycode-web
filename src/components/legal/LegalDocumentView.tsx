import Link from "next/link";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react/ssr";
import { legalDocuments, type LegalBlock, type LegalDocument } from "@/content/legal";
import { blockPlainText, type BlogBlock } from "@/content/blogShared";
import { cn, formatDate, slugify } from "@/lib/utils";
import { contactEmail, siteUrl } from "@/lib/site";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { PageToc } from "@/components/ui/PageToc";
import { CookiePreferencesButton, PrintButton } from "./LegalActions";
import { LegalTable } from "./LegalTable";

const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70";
const LINK_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Segment =
  | { kind: "prose"; blocks: BlogBlock[] }
  | { kind: "table"; block: Extract<LegalBlock, { type: "table" }> }
  | { kind: "preferences" };

/** Agrupa los bloques consecutivos del blog para que `ArticleBody` los renderice de una vez. */
function toSegments(content: LegalBlock[]): Segment[] {
  const segments: Segment[] = [];
  for (const block of content) {
    if (block.type === "table") {
      segments.push({ kind: "table", block });
    } else if (block.type === "cookie-preferences") {
      segments.push({ kind: "preferences" });
    } else {
      const last = segments[segments.length - 1];
      if (last?.kind === "prose") last.blocks.push(block);
      else segments.push({ kind: "prose", blocks: [block] });
    }
  }
  return segments;
}

function readingMinutes(content: LegalBlock[]): number {
  const words = content.reduce((total, block) => {
    if (block.type === "table") {
      return total + [...block.columns, ...block.rows.flat()].join(" ").split(/\s+/).length;
    }
    if (block.type === "cookie-preferences") return total;
    const text = blockPlainText(block);
    return total + (text ? text.split(/\s+/).length : 0);
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

/**
 * Documento legal (privacidad, cookies, términos). Server Component: las
 * únicas islas cliente son el índice con scrollspy (`PageToc`) y los botones
 * de imprimir / preferencias de cookies. Mismo lenguaje que los artículos del
 * blog (índice lateral sticky, en móvil un `<details>` arriba del texto), con
 * resumen en lenguaje llano, historial de cambios y contacto al final.
 */
export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const segments = toSegments(doc.content);
  const headings = doc.content.filter(
    (block): block is Extract<BlogBlock, { type: "heading" }> => block.type === "heading" && block.level === 2,
  );
  const tocItems = headings.map((heading) => ({ id: slugify(heading.text), label: heading.text }));
  const otherDocuments = legalDocuments.filter((other) => other.slug !== doc.slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      { "@type": "ListItem", position: 2, name: doc.title, item: `${siteUrl}/${doc.slug}` },
    ],
  };

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32 print:pt-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <header className="flex max-w-3xl flex-col gap-6">
          <nav aria-label="Ruta de navegación" className="print:hidden">
            <ol className="flex items-center gap-2 text-sm text-foreground/60">
              <li>
                <Link href="/" className={cn("rounded hover:text-foreground", LINK_FOCUS)}>
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground/80">{doc.title}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-4">
            <p className={LABEL}>Documento legal</p>
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              {doc.title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-foreground/80">{doc.description}</p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground/70">
              Versión {doc.version}
              <span aria-hidden="true"> · </span>
              Vigente desde <time dateTime={doc.updatedAt}>{formatDate(doc.updatedAt)}</time>
              <span aria-hidden="true"> · </span>
              {readingMinutes(doc.content)} min de lectura
            </p>
            <div className="print:hidden">
              <PrintButton />
            </div>
          </div>
        </header>

        {doc.summary && doc.summary.length > 0 && (
          <aside
            aria-labelledby="legal-summary"
            className="max-w-3xl rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:p-8 print:break-inside-avoid"
          >
            <h2 id="legal-summary" className={LABEL}>
              Resumen en 30 segundos
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {doc.summary.map((point) => (
                <li key={point} className="flex gap-3 text-base leading-relaxed text-foreground">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-foreground/10 pt-4 text-sm text-foreground/70">
              Es una guía rápida y no reemplaza el texto completo de abajo, que es el que rige.
            </p>
          </aside>
        )}

        <div className="grid gap-12 border-t border-foreground/10 pt-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-20 print:block print:border-0 print:pt-0">
          {tocItems.length > 0 && (
            <aside className="hidden lg:block print:hidden">
              <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                <PageToc items={tocItems} label="En este documento" layoutId="legal-toc-active" />
              </div>
            </aside>
          )}

          <div className={cn("min-w-0", tocItems.length === 0 && "lg:col-span-2")}>
            <div className="flex max-w-2xl flex-col gap-12">
              {tocItems.length > 0 && (
                <details className="group rounded-xl border border-foreground/10 lg:hidden print:hidden">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                    En este documento
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 rotate-90 transition-transform duration-200 group-open:-rotate-90 motion-reduce:transition-none"
                    />
                  </summary>
                  <ul className="flex flex-col border-t border-foreground/10 px-5 py-2">
                    {tocItems.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={cn("flex min-h-11 items-center rounded text-sm text-foreground/80 hover:text-foreground", LINK_FOCUS)}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <article className="flex flex-col gap-6">
                {segments.map((segment, index) => {
                  if (segment.kind === "prose") return <ArticleBody key={index} blocks={segment.blocks} />;
                  if (segment.kind === "table") {
                    return (
                      <LegalTable
                        key={index}
                        caption={segment.block.caption}
                        columns={segment.block.columns}
                        rows={segment.block.rows}
                      />
                    );
                  }
                  return <CookiePreferencesButton key={index} />;
                })}
              </article>

              <section aria-labelledby="legal-changelog" className="flex flex-col gap-5 print:break-inside-avoid">
                <h2 id="legal-changelog" className="scroll-mt-24 text-2xl font-bold tracking-tight text-foreground">
                  Historial de cambios
                </h2>
                <ol className="flex flex-col divide-y divide-foreground/10 rounded-xl border border-foreground/10">
                  {doc.changelog.map((entry) => (
                    <li key={entry.date} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6 sm:p-5">
                      <time
                        dateTime={entry.date}
                        className="shrink-0 font-mono text-xs font-medium text-foreground/70 sm:w-36 sm:pt-0.5"
                      >
                        {formatDate(entry.date)}
                      </time>
                      <p className="text-sm leading-relaxed text-foreground/80">{entry.change}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section
                aria-labelledby="legal-contact"
                className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:p-8 print:break-inside-avoid"
              >
                <h2 id="legal-contact" className="text-xl font-bold tracking-tight text-foreground">
                  ¿Dudas sobre este documento?
                </h2>
                <p className="text-base leading-relaxed text-foreground/80">
                  Escríbanos y le responde una persona del equipo, no un formulario automático. Para ejercer sus
                  derechos sobre sus datos personales use el mismo correo e indique su solicitud.
                </p>
                <a
                  href={`mailto:${contactEmail}`}
                  className={cn(
                    "inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-foreground/20 bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5",
                    LINK_FOCUS,
                  )}
                >
                  <EnvelopeSimple size={16} aria-hidden="true" />
                  {contactEmail}
                </a>
              </section>

              <nav aria-labelledby="legal-others" className="flex flex-col gap-4 print:hidden">
                <h2 id="legal-others" className={LABEL}>
                  Otros documentos legales
                </h2>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {otherDocuments.map((other) => (
                    <li key={other.slug}>
                      <Link
                        href={`/${other.slug}`}
                        className={cn(
                          "group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground/25",
                          LINK_FOCUS,
                        )}
                      >
                        {other.title}
                        <ArrowRight
                          size={14}
                          aria-hidden="true"
                          className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
