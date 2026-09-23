"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FileText, Plus, Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import type { Article, ArticleStatus } from "@/lib/queries/articles";

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  published: "Publicado",
};

const STATUS_TONES: Record<ArticleStatus, BadgeTone> = {
  draft: "neutral",
  review: "warning",
  published: "success",
};

const LOCALE_LABELS: Record<string, string> = { es: "ES", en: "EN", fr: "FR" };

interface ContentBoardProps {
  articles: Article[];
  total: number;
  page: number;
  pageSize: number;
  status: ArticleStatus | "ALL";
  locale: "es" | "en" | "fr" | "ALL";
  q: string;
  canWrite: boolean;
}

export function ContentBoard({ articles, total, page, pageSize, status, locale, q, canWrite }: ContentBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [creating, setCreating] = useState(false);

  const [searchInput, setSearchInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchInput(q);
  }
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQuery = (overrides: Partial<{ q: string; status: string; locale: string; page: number }>) => {
    const nextQ = overrides.q ?? q;
    const nextStatus = overrides.status ?? status;
    const nextLocale = overrides.locale ?? locale;
    const resetPage = overrides.q !== undefined || overrides.status !== undefined || overrides.locale !== undefined;
    const nextPage = overrides.page ?? (resetPage ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextLocale !== "ALL") params.set("locale", nextLocale);
    if (nextPage > 1) params.set("page", String(nextPage));

    startNavigation(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => pushQuery({ q: value }), 400);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/articles", { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { id: number };
        router.push(`/dashboard/contenido/${data.id}`);
        return;
      }
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contenido</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Borradores del blog — generados por el cron de SEO o creados a mano, revisados y publicados acá.
          </p>
        </div>
        {canWrite && (
          <Button variant="accent" onClick={handleCreate} disabled={creating} className="self-start sm:self-auto">
            <Plus size={14} />
            <span>{creating ? "Creando…" : "Nuevo artículo"}</span>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background border border-foreground/10 shadow-sm shadow-black/5 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por título o slug..."
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-foreground/60 outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => pushQuery({ status: e.target.value })}
            className="rounded-xl border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            <option value="ALL" className="bg-background text-foreground">Todos los estados</option>
            {(Object.keys(STATUS_LABELS) as ArticleStatus[]).map((s) => (
              <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={locale}
            onChange={(e) => pushQuery({ locale: e.target.value })}
            className="rounded-xl border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            <option value="ALL" className="bg-background text-foreground">Todos los idiomas</option>
            <option value="es" className="bg-background text-foreground">Español</option>
            <option value="en" className="bg-background text-foreground">English</option>
            <option value="fr" className="bg-background text-foreground">Français</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {articles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin artículos"
            description={total === 0 ? "Todavía no hay borradores — créalo a mano o espera al próximo cron de generación." : "Intente ajustar los filtros de búsqueda."}
            action={canWrite && total === 0 ? { label: "Nuevo artículo", onClick: handleCreate } : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Artículos del blog con su estado, idioma y última actualización</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Título</th>
                    <th scope="col" className="px-5 py-3.5">Idioma</th>
                    <th scope="col" className="px-5 py-3.5">Estado</th>
                    <th scope="col" className="px-5 py-3.5">Origen</th>
                    <th scope="col" className="px-5 py-3.5">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {articles.map((article) => (
                    <tr key={article.id}>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/dashboard/contenido/${article.id}`}
                          className="font-medium text-foreground hover:text-accent-strong outline-none rounded focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {article.title || <span className="text-foreground/40 italic">Sin título</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-foreground/60">{LOCALE_LABELS[article.locale]}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={STATUS_TONES[article.status]}>{STATUS_LABELS[article.status]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-foreground/60">
                        {article.targetKeyword ? (
                          <span className="inline-flex items-center gap-1" title={`Generado desde: ${article.targetKeyword}`}>
                            <Sparkles size={12} className="text-accent" /> Cron
                          </span>
                        ) : (
                          "Manual"
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-foreground/60 whitespace-nowrap">
                        {new Date(article.updatedAt).toLocaleDateString("es-CO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-foreground/10 px-5 py-3.5 text-xs text-foreground/60 font-mono">
              <div>
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} artículos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pushQuery({ page: page - 1 })}
                  disabled={page === 1 || isNavigating}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 hover:bg-foreground/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => pushQuery({ page: page + 1 })}
                  disabled={page === totalPages || isNavigating}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 hover:bg-foreground/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
