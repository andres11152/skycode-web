import { cn } from "@/lib/utils";

/**
 * Bloque de carga: base neutra con un barrido de brillo (`.skeleton` en
 * globals.css, `transform`, sin animar layout) y estático con
 * `prefers-reduced-motion`. Decorativo (`aria-hidden`): quien lo use debe
 * marcar el contenedor con `aria-busy` y dar un texto accesible si hace falta.
 *
 * El skeleton solo se usa donde algo carga de verdad (un chunk diferido, una
 * imagen): copia la forma EXACTA del contenido final para que no haya salto
 * de layout. No se pone un skeleton delante de contenido que ya viene en el HTML.
 */
export function Skeleton({ className, dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-xl", dark && "skeleton-dark", className)} />;
}
