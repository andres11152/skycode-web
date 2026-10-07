import type { BlogPost } from "@/content/blogShared";
import { cn } from "@/lib/utils";

/**
 * Portada tipográfica de un post: los artículos no tienen imagen (la tabla
 * `articles` no tiene campo de portada) y no se usan fotos de stock ni
 * imágenes generadas — se compone con el lenguaje visual del sitio
 * (superficie `bg-foreground`, grilla fina, la etiqueta en mono y un resplandor
 * de marca; sin pictograma del tema: una nube para "nube" o una llave para
 * "outsourcing" es el mapeo literal sustantivo → ícono de plantilla). Sin `"use client"` ni estado:
 * viaja dentro de `BlogTeaser` (cliente) y de las páginas del blog
 * (servidor) por igual. La misma composición, con el título, genera la
 * imagen OG de cada post (`lib/blogOgImage.tsx`).
 *
 * Decorativa (`aria-hidden`): el título y la etiqueta ya están en el texto
 * de la tarjeta o del encabezado.
 */
export function PostCover({
  post,
  className,
}: {
  post: Pick<BlogPost, "slug" | "tags" | "title">;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("relative isolate overflow-hidden bg-foreground", className)}>
      <div className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transform-none">
        <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(to_right,var(--background)_1px,transparent_1px),linear-gradient(to_bottom,var(--background)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_72%_62%,black,transparent_72%)]" />
        <div className="absolute -right-8 -bottom-10 h-44 w-44 rounded-full bg-accent/25 blur-3xl" />
      </div>
      {post.tags[0] && (
        <span className="absolute top-4 left-4 font-mono text-[11px] font-medium tracking-[0.2em] text-background/75 uppercase sm:top-5 sm:left-5">
          {post.tags[0]}
        </span>
      )}
    </div>
  );
}
