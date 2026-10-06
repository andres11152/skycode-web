import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

/**
 * Cabecera de página del panel: volver (opcional), título, descripción y
 * acciones. Las acciones bajan debajo del título en móvil y se alinean a la
 * derecha desde `sm`. El enlace "Volver" mide 44px de alto (en las fichas
 * medía lo que medía el texto).
 */
const BACK_CLASS =
  "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Enlace "Volver a …" suelto, para vistas que ya tienen su propia cabecera. 44px de alto. */
export function PageBack({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={BACK_CLASS}>
      <ArrowLeft size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  back,
  actions,
  badge,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** Chip junto al título (estado). */
  badge?: React.ReactNode;
}) {
  return (
    <header className="space-y-3">
      {back && (
        <PageBack href={back.href} label={back.label} />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 text-xs leading-relaxed text-foreground/70">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
