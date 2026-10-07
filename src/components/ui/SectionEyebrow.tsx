import { cn } from "@/lib/utils";

/**
 * Etiqueta corta sobre un título de sección — tipografía sola: mono, tracking
 * amplio y un único tono neutro (`foreground/70`, `background/70` sobre
 * banda oscura). Sin degradado, sin brillo animado, sin color de marca: la
 * versión anterior (texto con degradado azul y barrido de brillo, repetida
 * en las 12 secciones) es el rastro de plantilla generada más reconocible, y
 * además gastaba el acento, que debe quedar para 2–3 puntos de contacto.
 * Regla única — no se reinventa por sección, todas importan este componente.
 */
export function SectionEyebrow({
  children,
  className,
  onDark = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Secciones oscuras (bg-foreground): el texto va en `background/70`. */
  onDark?: boolean;
}) {
  return (
    <p
      className={cn(
        "inline-block font-mono text-xs font-medium uppercase tracking-[0.2em]",
        onDark ? "text-background/70" : "text-foreground/70",
        className,
      )}
    >
      {children}
    </p>
  );
}
