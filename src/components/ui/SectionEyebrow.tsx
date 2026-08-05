import { cn } from "@/lib/utils";

/**
 * Etiqueta corta sobre un título de sección — resuelta con tipografía sola
 * (mono, tracking amplio, un solo color de acento), sin píldora ni punto ni
 * fondo. La versión anterior (borde + fondo + punto, repetida en cada
 * sección) es el patrón más reconocible de plantilla genérica de IA; esto es
 * lo que hacen Linear/Stripe/Vercel en su lugar. Regla única — no se
 * reinventa por sección, todas importan este componente.
 */
export function SectionEyebrow({
  children,
  className,
  onDark = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Secciones oscuras (bg-foreground) necesitan el accent claro, no accent-strong
   * (que en fondo oscuro cae a ~3.3:1, por debajo del 4.5:1 que exige texto normal). */
  onDark?: boolean;
}) {
  return (
    <p
      className={cn(
        "font-mono text-xs font-bold uppercase tracking-[0.2em]",
        onDark ? "text-accent" : "text-accent-strong",
        className,
      )}
    >
      {children}
    </p>
  );
}
