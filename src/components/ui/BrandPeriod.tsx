import { cn } from "@/lib/utils";

/**
 * El punto del logo ("SkyCode.") como cierre de un titular: un círculo, no el glifo ".", para que
 * tenga el mismo peso que en las piezas de Instagram. Escala con el texto (0,16em) con un mínimo
 * de 5px para los encabezados pequeños del Footer. Su color es `--brand-dot`: amarillo, y negro
 * dentro de una `.band-yellow`. Decorativo (`aria-hidden`) y sin texto: el titular se lee igual.
 * Usos: H1 del Hero, cierre de la home y encabezados del Footer.
 */
export function BrandPeriod({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("ml-[0.05em] inline-block size-[max(0.16em,5px)] rounded-full bg-brand-dot", className)}
    />
  );
}
