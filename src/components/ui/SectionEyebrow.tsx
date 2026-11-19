import { cn } from "@/lib/utils";

/**
 * Etiqueta corta sobre un título de sección: mono, tracking amplio y un único
 * tono neutro (`foreground/70`, `on-inverse/70` sobre banda), precedida del
 * punto del logo (`--brand-dot`: amarillo, negro dentro de una banda amarilla),
 * igual que en las piezas de Instagram. El texto nunca lleva color de marca:
 * la versión anterior (degradado azul con barrido de brillo, repetida en 12
 * secciones) era el rastro de plantilla más reconocible y gastaba el acento.
 * Regla única: no se reinventa por sección, todas importan este componente.
 */
export function SectionEyebrow({
  children,
  className,
  onDark = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Secciones oscuras (bg-inverse): el texto va en `on-inverse/70`. */
  onDark?: boolean;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.2em]",
        onDark ? "text-on-inverse/70" : "text-foreground/70",
        className,
      )}
    >
      <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-brand-dot" />
      <span>{children}</span>
    </p>
  );
}
