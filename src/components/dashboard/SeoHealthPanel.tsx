import { Activity, AlertOctagon, Clock, Gauge, Link2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Badge, type BadgeTone } from "./ui/Badge";
import { StatCard } from "./ui/StatCard";
import type { SeoHealthRun, SeoHealthRunSummary } from "@/lib/queries/seoHealth";
import type { SeoIssueCode, SeoPageResult } from "@/lib/seoHealth";
import { formatDateTime } from "@/lib/utils";

/** Meta de respuesta del servidor (plan de SEO): por encima, la celda se marca como lenta. */
const TTFB_GOAL_MS = 600;
/** Si la última corrida es más vieja que esto, el cron diario dejó de correr. */
const STALE_AFTER_HOURS = 36;

const ISSUE_LABEL: Record<SeoIssueCode, string> = {
  fetch_error: "Sin respuesta",
  status: "Status ≠ 200",
  canonical_missing: "Sin canonical",
  canonical_mismatch: "Canonical incorrecto",
  title_missing: "Sin título",
  title_duplicate: "Título duplicado",
  title_too_long: "Título largo",
  description_missing: "Sin descripción",
  description_too_long: "Descripción larga",
  h1_count: "H1 incorrecto",
  noindex_in_sitemap: "noindex en sitemap",
  todo_placeholder: "Marcador TODO",
  img_missing_alt: "Imagen sin alt",
  lastmod_missing: "Sin lastmod",
};

function issueTone(code: SeoIssueCode): BadgeTone {
  // Lo que puede sacar páginas del índice o fusionarlas con otra es lo grave.
  return code === "canonical_mismatch" || code === "canonical_missing" || code === "fetch_error" || code === "status" || code === "noindex_in_sitemap"
    ? "danger"
    : "warning";
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, "") || "/";
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function SeoHealthPanel({ run, history }: { run: SeoHealthRun | null; history: SeoHealthRunSummary[] }) {
  if (!run) {
    return (
      <section aria-label="Salud técnica" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        <EmptyState
          icon={Activity}
          title="Salud técnica: todavía sin auditorías"
          description="El cron diario seo-pulse (o POST /api/cron/seo-health) recorre el sitemap de producción y guarda aquí canonical, títulos, H1, status y TTFB de cada URL. Aún no ha corrido ninguna vez."
        />
      </section>
    );
  }

  const withIssues = run.results.filter((page) => page.issues.length > 0);
  const canonicalProblems = run.results.filter((page) =>
    page.issues.some((issue) => issue.code === "canonical_mismatch" || issue.code === "canonical_missing")
  );
  const stale = hoursSince(run.finishedAt) > STALE_AFTER_HOURS;
  const slowest = [...run.results].filter((p) => p.ttfbMs !== null).sort((a, b) => (b.ttfbMs ?? 0) - (a.ttfbMs ?? 0));
  const slowCount = slowest.filter((p) => (p.ttfbMs ?? 0) > TTFB_GOAL_MS).length;

  return (
    <section aria-label="Salud técnica" className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Salud técnica</h2>
        <p className="mt-1 text-xs text-foreground/70">
          Auditoría diaria de {run.baseUrl}/sitemap.xml · última corrida {formatDateTime(run.finishedAt)}. Misma lógica que{" "}
          <code className="font-mono">npm run seo:check</code>.
        </p>
      </div>

      {canonicalProblems.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-danger">
          <p className="flex items-center gap-2 text-sm font-bold">
            <AlertOctagon size={16} aria-hidden="true" />
            {canonicalProblems.length} {canonicalProblems.length === 1 ? "página con canonical incorrecto" : "páginas con canonical incorrecto"}
          </p>
          <p className="mt-1 text-xs">
            Google puede tratarlas como duplicados de otra URL y sacarlas del índice. Revisa la metadata de la ruta y
            vuelve a publicar.
          </p>
          <ul className="mt-3 space-y-1 text-xs">
            {canonicalProblems.slice(0, 8).map((page) => (
              <li key={page.url} className="break-all">
                <span className="font-mono font-bold">{shortUrl(page.url)}</span>{" "}
                → {page.canonical ? shortUrl(page.canonical) : "sin canonical"}
              </li>
            ))}
            {canonicalProblems.length > 8 && <li>…y {canonicalProblems.length - 8} más (ver la tabla de abajo).</li>}
          </ul>
        </div>
      )}

      {stale && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-warning">
          <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          La última auditoría tiene más de {STALE_AFTER_HOURS} horas: el cron diario no está corriendo.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="URLs con problemas"
          value={`${run.pagesWithErrors} / ${run.totalPages}`}
          tone={run.pagesWithErrors > 0 ? "danger" : "success"}
          icon={<Activity size={18} className="text-accent-strong" />}
        />
        <StatCard
          label="Canonical incorrectos"
          value={run.canonicalErrors}
          tone={run.canonicalErrors > 0 ? "danger" : "success"}
          icon={<Link2 size={18} className="text-accent-strong" />}
        />
        <StatCard
          label="Títulos duplicados"
          value={run.duplicateTitles}
          tone={run.duplicateTitles > 0 ? "warning" : "success"}
        />
        <StatCard label="H1 incorrectos" value={run.missingH1} tone={run.missingH1 > 0 ? "warning" : "success"} />
        <StatCard
          label="URLs no-200"
          value={run.nonOkStatus}
          tone={run.nonOkStatus > 0 ? "danger" : "success"}
        />
        <StatCard
          label="TTFB medio"
          value={run.avgTtfbMs === null ? "—" : `${run.avgTtfbMs} ms`}
          hint={`Meta < ${TTFB_GOAL_MS} ms`}
          tone={run.avgTtfbMs !== null && run.avgTtfbMs > TTFB_GOAL_MS ? "warning" : "neutral"}
          icon={<Gauge size={18} className="text-accent-strong" />}
        />
        <StatCard
          label="TTFB máximo"
          value={run.maxTtfbMs === null ? "—" : `${run.maxTtfbMs} ms`}
          hint={slowCount > 0 ? `${slowCount} URL(s) sobre la meta` : "Todas dentro de la meta"}
          tone={slowCount > 0 ? "warning" : "neutral"}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Problemas por URL</h3>
        {withIssues.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={Activity} title="Sin problemas" description={`Las ${run.totalPages} URLs del sitemap pasan todas las comprobaciones.`} />
          </div>
        ) : (
          <IssuesTable pages={withIssues} />
        )}
      </div>

      <details className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-bold text-foreground">
          TTFB por URL ({run.results.length})
        </summary>
        <div className="overflow-x-auto border-t border-foreground/10">
          <table data-keep-table data-sticky-first className="w-full text-left text-xs text-foreground/90">
            <caption className="sr-only">URLs ordenadas por tiempo hasta el primer byte, de mayor a menor</caption>
            <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
              <tr>
                <th scope="col" className="px-5 py-3">URL</th>
                <th scope="col" className="px-5 py-3 text-right">Status</th>
                <th scope="col" className="px-5 py-3 text-right">TTFB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {slowest.map((page) => (
                <tr key={page.url}>
                  <td className="break-all px-5 py-2.5 text-foreground">{shortUrl(page.url)}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-foreground/70">{page.status ?? "—"}</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    <span className={(page.ttfbMs ?? 0) > TTFB_GOAL_MS ? "font-bold text-warning" : "text-foreground/70"}>
                      {page.ttfbMs} ms
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {history.length > 1 && (
        <details className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <summary className="cursor-pointer px-5 py-3.5 text-sm font-bold text-foreground">
            Historial de corridas ({history.length})
          </summary>
          <div className="overflow-x-auto border-t border-foreground/10">
            <table data-keep-table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Últimas auditorías de salud técnica</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                <tr>
                  <th scope="col" className="px-5 py-3">Fecha</th>
                  <th scope="col" className="px-5 py-3 text-right">Con problemas</th>
                  <th scope="col" className="px-5 py-3 text-right">Canonical</th>
                  <th scope="col" className="px-5 py-3 text-right">TTFB medio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-2.5 text-foreground">{formatDateTime(item.finishedAt)}</td>
                    <td className="px-5 py-2.5 text-right font-mono">{item.pagesWithErrors} / {item.totalPages}</td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      <span className={item.canonicalErrors > 0 ? "font-bold text-danger" : "text-foreground/70"}>{item.canonicalErrors}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-foreground/70">{item.avgTtfbMs === null ? "—" : `${item.avgTtfbMs} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function IssuesTable({ pages }: { pages: SeoPageResult[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
      <div className="overflow-x-auto">
        <table data-keep-table data-sticky-first className="w-full text-left text-xs text-foreground/90">
          <caption className="sr-only">URLs del sitemap con problemas de SEO técnico</caption>
          <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
            <tr>
              <th scope="col" className="px-5 py-3">URL</th>
              <th scope="col" className="px-5 py-3">Problemas</th>
              <th scope="col" className="px-5 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {pages.map((page) => (
              <tr key={page.url} className="align-top">
                <td className="break-all px-5 py-3 text-foreground">{shortUrl(page.url)}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {page.issues.map((issue, index) => (
                      <Badge key={`${issue.code}-${index}`} tone={issueTone(issue.code)}>
                        {ISSUE_LABEL[issue.code]}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-foreground/70">
                  <ul className="space-y-1">
                    {page.issues.map((issue, index) => (
                      <li key={`${issue.code}-${index}`}>{issue.message}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
