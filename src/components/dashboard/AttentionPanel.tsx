import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttentionGroup, AttentionTone } from "@/lib/queries/attention";

const TONE_DOT: Record<AttentionTone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};
const TONE_COUNT: Record<AttentionTone, string> = {
  danger: "bg-danger/10 text-danger border-danger/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  info: "bg-info/10 text-info border-info/25",
};

/**
 * "Requiere tu atención": lo accionable de hoy, cada fila enlazada al módulo
 * donde se resuelve. Antes la portada era un mapa de contadores (y solo la veía
 * el admin); esto responde primero "¿qué tengo que hacer ahora?". Sin
 * animaciones ni JS: es un Server Component.
 */
export function AttentionPanel({ groups }: { groups: AttentionGroup[] }) {
  if (groups.length === 0) {
    return (
      <section
        aria-labelledby="attention-heading"
        className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 p-5"
      >
        <CircleCheck size={20} className="shrink-0 text-success" aria-hidden="true" />
        <div>
          <h2 id="attention-heading" className="text-sm font-bold text-foreground">
            Todo al día
          </h2>
          <p className="text-xs text-foreground/70">No hay nada vencido ni en riesgo para ti ahora mismo.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="attention-heading" className="space-y-3">
      <h2 id="attention-heading" className="text-sm font-bold text-foreground">
        Requiere tu atención
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <div key={group.key} className="min-w-0 rounded-xl border border-foreground/10 bg-background p-5 shadow-sm shadow-black/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[group.tone])} />
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <span
                className={cn("shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums", TONE_COUNT[group.tone])}
                aria-label={`${group.total} en total`}
              >
                {group.total}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-foreground/10">
              {group.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="-mx-2 block rounded-lg px-2 py-2.5 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="block truncate text-sm font-medium text-foreground">{row.title}</span>
                    <span className="block truncate text-xs text-foreground/70">{row.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={group.href}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold text-accent-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
            >
              {group.total > group.rows.length ? `Ver las ${group.total}` : "Abrir módulo"}
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
