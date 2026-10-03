import { ViewTransition } from "react";

/**
 * Interruptor único de las transiciones de vista del sitio. `ViewTransition`
 * está marcado como experimental en la documentación de Next.js 16: si
 * alguna vez causa un problema real (INP, CLS, un navegador concreto),
 * poner esto en `false` las apaga en todo el sitio sin tocar ningún
 * componente — `CoverTransition` pasa a renderizar solo sus hijos.
 */
const ENABLE_VIEW_TRANSITIONS = true;

/**
 * Morph de la portada de un caso del portafolio: la miniatura del listado
 * (`/portafolio`) "viaja" hasta la portada grande de `/portafolio/[slug]` y
 * vuelve al regresar. Mismo `name` en origen y destino es lo que crea la
 * identidad; `share="morph"` + `default="none"` hace que SOLO ese par anime
 * (sin `default="none"`, cada elemento nombrado haría su propio crossfade en
 * cualquier navegación) y deja el estilo en `globals.css` (`.morph`). Sin
 * soporte del navegador, o con reduced motion (ver globals.css), la
 * navegación funciona igual, sin animación.
 */
export function CoverTransition({ slug, children }: { slug: string; children: React.ReactNode }) {
  if (!ENABLE_VIEW_TRANSITIONS) return <>{children}</>;

  return (
    <ViewTransition name={`project-cover-${slug}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
