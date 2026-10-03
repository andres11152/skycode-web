"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";
import { stripInlineLinks } from "@/lib/inlineLinks";
import { faqPath } from "@/lib/faqPaths";
import { SPRING_SNAPPY } from "@/lib/animations";
import { localeHomePath, t, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { FaqCategory, FaqPageCopy } from "@/content/faq";

const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const SECONDARY_ON_DARK =
  "border-background/25 text-background hover:border-background/40 hover:bg-background/10 focus-visible:ring-offset-foreground";

/** Minúsculas y sin tildes: "garantia" encuentra "garantía", "securite" encuentra "sécurité". */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter((token) => token.length > 1);
}

/** Resalta las coincidencias SOBRE el texto original (los índices del normalizado coinciden: NFD sin tildes conserva longitud por carácter base). */
function HighlightedText({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>;
  // Se compara por posición carácter a carácter: se normaliza cada carácter
  // por separado para que los índices no se desfasen con letras acentuadas.
  const flags = Array.from(text, () => false);
  const chars = Array.from(text);
  const folded = chars.map((char) => normalize(char));
  const haystack = folded.join("");
  // Mapa de índice del texto plegado -> índice de carácter original.
  const indexMap: number[] = [];
  folded.forEach((piece, charIndex) => {
    for (let i = 0; i < piece.length; i += 1) indexMap.push(charIndex);
  });
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(token, from);
      if (at === -1) break;
      for (let i = at; i < at + token.length; i += 1) flags[indexMap[i]] = true;
      from = at + token.length;
    }
  }

  const parts: { text: string; marked: boolean }[] = [];
  chars.forEach((char, index) => {
    const last = parts[parts.length - 1];
    if (last && last.marked === flags[index]) last.text += char;
    else parts.push({ text: char, marked: flags[index] });
  });

  return (
    <>
      {parts.map((part, index) =>
        part.marked ? (
          <mark key={index} className="rounded-sm bg-foreground/10 px-0.5 text-foreground">
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

export function FaqPageView({
  locale,
  copy,
  categories,
  total,
}: {
  locale: Locale;
  copy: FaqPageCopy;
  categories: FaqCategory[];
  total: number;
}) {
  const reduced = Boolean(useReducedMotion());
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<string>(categories[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const tokens = useMemo(() => tokenize(query), [query]);
  const searching = tokens.length > 0;

  // Índice de búsqueda precalculado una vez (pregunta + respuesta sin sintaxis de enlace).
  const searchable = useMemo(
    () =>
      categories.map((category) => ({
        category,
        entries: category.items.map((item) => ({
          item,
          haystack: normalize(`${item.question} ${stripInlineLinks(item.answer)}`),
        })),
      })),
    [categories],
  );

  const visible = useMemo(
    () =>
      searchable
        .map(({ category, entries }) => ({
          category,
          items: entries
            .filter(({ haystack }) => tokens.every((token) => haystack.includes(token)))
            .map(({ item }) => item),
        }))
        .filter(({ items }) => items.length > 0),
    [searchable, tokens],
  );
  const resultCount = visible.reduce((sum, group) => sum + group.items.length, 0);

  // `/` enfoca el buscador (convención de docs: GitHub, Stripe, Linear), salvo si ya se está escribiendo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Tema "activo" según el scroll: el que cruza la franja superior-media del viewport.
  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`tema-${category.id}`))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveTopic(entry.target.id.replace("tema-", ""));
        }
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories, searching]);

  const homeHref = localeHomePath(locale);
  const prefix = homeHref === "/" ? "" : homeHref;
  const shareBase = `${siteUrl}${faqPath(locale)}`;
  const visibleIds = new Set(visible.map((group) => group.category.id));

  return (
    <main id="main-content" className="pt-28 sm:pt-36">
      <header className="mx-auto max-w-6xl px-6">
        <nav aria-label={copy.breadcrumbAria}>
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link href={homeHref} className={cn("rounded hover:text-foreground", FOCUS)}>
                {copy.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{copy.title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-8">
            <SectionEyebrow className="mb-4">{copy.badge}</SectionEyebrow>
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/80">{copy.description}</p>
          </div>
          <p className="flex items-baseline gap-3 lg:col-span-4 lg:flex-col lg:items-end lg:gap-0">
            <span className="font-mono text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              {String(total).padStart(2, "0")}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
              {t(copy.countLabel, { topics: String(categories.length) })}
            </span>
          </p>
        </div>
      </header>

      <div className="mx-auto mt-12 grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-8 px-6 sm:mt-16 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Buscador: primero en móvil; en desktop ocupa la columna derecha, fila 1. */}
        <div className="lg:col-start-2 lg:row-start-1">
          <div role="search">
            <label htmlFor="faq-search" className="sr-only">
              {copy.searchLabel}
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={20}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60"
              />
              <input
                ref={inputRef}
                id="faq-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
                placeholder={copy.searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="h-14 w-full rounded-xl border border-foreground/15 bg-background pl-12 pr-24 text-base text-foreground outline-none transition-colors placeholder:text-foreground/60 hover:border-foreground/30 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-search-cancel-button]:hidden"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label={copy.clearSearch}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground",
                      FOCUS,
                    )}
                  >
                    <X size={18} />
                  </button>
                ) : (
                  <kbd
                    aria-hidden="true"
                    title={copy.searchHint}
                    className="mr-2 hidden rounded-md border border-foreground/15 px-2 py-1 font-mono text-xs text-foreground/70 sm:block"
                  >
                    /
                  </kbd>
                )}
              </div>
            </div>
          </div>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-foreground/70">
            {searching &&
              (resultCount > 0
                ? t(resultCount === 1 ? copy.resultsOne : copy.resultsMany, {
                    count: String(resultCount),
                    query: query.trim(),
                  })
                : t(copy.noResultsTitle, { query: query.trim() }))}
          </p>
        </div>

        {/* Índice de temas: chips con scroll horizontal en móvil, lista fija en desktop. Una sola
            instancia, así la píldora compartida (`layoutId`) nunca tiene dos destinos a la vez. */}
        <nav
          aria-label={copy.topicsAria}
          className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-28 lg:h-fit"
        >
          <p className="mb-3 hidden text-xs font-medium uppercase tracking-wide text-foreground/70 lg:block">
            {copy.topicsLabel}
          </p>
          <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const isActive = activeTopic === category.id && (!searching || visibleIds.has(category.id));
              const disabled = searching && !visibleIds.has(category.id);
              return (
                <li key={category.id} className="shrink-0">
                  <a
                    href={`#tema-${category.id}`}
                    aria-current={isActive ? "true" : undefined}
                    aria-disabled={disabled || undefined}
                    tabIndex={disabled ? -1 : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-150",
                      isActive ? "text-foreground" : "text-foreground/70 hover:text-foreground",
                      disabled && "pointer-events-none opacity-40",
                      FOCUS,
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="faq-topic-pill"
                        transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full bg-foreground/[0.06]"
                      />
                    )}
                    <span className="relative">{category.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="lg:col-start-2 lg:row-start-2">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-foreground/10 p-8 sm:p-10">
              <p className="text-xl font-bold tracking-tight text-foreground">
                {t(copy.noResultsTitle, { query: query.trim() })}
              </p>
              <p className="mt-2 max-w-md text-foreground/80">{copy.noResultsBody}</p>
              <Button href={`${prefix}/#contacto`} variant="accent" size="md" className="mt-6">
                {copy.ctaPrimary}
              </Button>
            </div>
          ) : (
            visible.map(({ category, items }) => (
              <section
                key={category.id}
                id={`tema-${category.id}`}
                aria-labelledby={`tema-${category.id}-title`}
                className="scroll-mt-28 pb-14 last:pb-0"
              >
                <h2
                  id={`tema-${category.id}-title`}
                  className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                  {category.title}
                </h2>
                <p className="mt-2 max-w-xl text-foreground/80">{category.description}</p>
                <div className="mt-6 border-t border-foreground/10">
                  {/* La clave cambia entre "buscando" y "navegando": al buscar, los resultados
                      nacen abiertos y con fundido; al limpiar, vuelven cerrados. */}
                  {items.map((item) => (
                    <FaqAccordionItem
                      key={`${item.id}-${searching ? "s" : "n"}`}
                      item={item}
                      linkable
                      shareUrl={`${shareBase}#${item.id}`}
                      copyLabel={copy.copyLink}
                      copiedLabel={copy.linkCopied}
                      openOnMount={searching}
                      animateIn={searching}
                      highlight={searching ? <HighlightedText text={item.question} tokens={tokens} /> : undefined}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* Cierre: banda oscura (bg-foreground), la única de la página. */}
      <section aria-label={copy.ctaTitle} className="mt-20 bg-foreground sm:mt-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-24 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-background sm:text-4xl">
              {copy.ctaTitle}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-background/80">{copy.ctaBody}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              href={`${prefix}/#contacto`}
              variant="accent"
              size="lg"
              className="focus-visible:ring-offset-foreground"
            >
              {copy.ctaPrimary}
            </Button>
            <Button href={`${prefix}/cotizador`} variant="secondary" size="lg" className={SECONDARY_ON_DARK}>
              {copy.ctaSecondary}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
