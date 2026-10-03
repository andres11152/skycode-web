"use client";

// Frontera cliente explícita: `ServiceView` (Server Component) también usa
// estos pares, y `ViewTransition` es una API del runtime de React en el
// navegador. Los hijos pueden seguir viniendo renderizados del servidor.
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
  return <MorphTransition name={`project-cover-${slug}`}>{children}</MorphTransition>;
}

/**
 * Par morph genérico: mismo `name` en origen y destino (debe ser único entre
 * los elementos visibles de cada página). Lo usan la portada del portafolio
 * y el ícono + la demo de cada servicio (`/servicios` -> `/servicios/[slug]`).
 *
 * Límite real (verificado en Chrome): React solo empareja elementos que
 * están en el viewport en ambos estados, y Next reinicia el scroll al
 * navegar. Si el origen está más abajo del primer pantallazo, el destino
 * (arriba de la página nueva) se mide fuera de pantalla y la navegación cae
 * al crossfade normal, sin morph. No es un error: es la degradación esperada.
 */
export function MorphTransition({ name, children }: { name: string; children: React.ReactNode }) {
  if (!ENABLE_VIEW_TRANSITIONS) return <>{children}</>;

  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
