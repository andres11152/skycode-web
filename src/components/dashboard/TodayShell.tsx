import Link from "next/link";
import { AttentionPanel } from "./AttentionPanel";
import { getVisibleGroups } from "./navConfig";
import { roleLabel } from "./roleLabels";
import type { AttentionGroup } from "@/lib/queries/attention";

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("es-CO", { hour: "numeric", hour12: false, timeZone: "America/Bogota" }).format(now));
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const TODAY = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });

/**
 * Inicio del panel para TODOS los roles: saludo, "requiere tu atención" y,
 * debajo, lo que cada rol tenga (resumen del negocio para el admin; accesos a
 * sus módulos para el resto). Antes solo el admin tenía inicio y los demás
 * roles caían en redirect a su primer módulo, sin ver nunca lo urgente.
 */
export function TodayShell({
  name,
  role,
  groups,
  children,
}: {
  name: string;
  role: string;
  groups: AttentionGroup[];
  /** Contenido propio del rol (resumen ejecutivo para el admin). Sin él, se muestran accesos a módulos. */
  children?: React.ReactNode;
}) {
  const now = new Date();
  const firstName = name.trim().split(/\s+/)[0] || name;
  const modules = getVisibleGroups(role);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting(now)}, {firstName}
        </h1>
        <p className="mt-1 text-xs text-foreground/70 first-letter:uppercase">
          {TODAY.format(now)} · {roleLabel(role)}
        </p>
      </header>

      <AttentionPanel groups={groups} />

      {children ??
        (modules.length > 0 ? (
          <section aria-labelledby="modules-heading" className="space-y-3">
            <h2 id="modules-heading" className="text-sm font-bold text-foreground">
              Tus módulos
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.flatMap((group) =>
                group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-foreground/10 bg-background px-4 shadow-sm shadow-black/5 outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <item.icon size={18} className="shrink-0 text-accent-strong" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
                      <span className="block text-xs text-foreground/70">{group.label}</span>
                    </span>
                  </Link>
                )),
              )}
            </div>
          </section>
        ) : (
          <p className="py-10 text-center text-xs text-foreground/70">
            Tu rol ({roleLabel(role)}) no tiene acceso a ninguna sección del panel por ahora.
          </p>
        ))}
    </div>
  );
}
