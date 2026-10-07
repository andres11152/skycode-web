"use client";

// Frontera cliente explícita: `ViewTransition` es una API del runtime de React en el navegador.
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * Interruptor único de la transición entre páginas (mismo criterio que
 * `ENABLE_VIEW_TRANSITIONS` en CoverTransition.tsx): `ViewTransition` es
 * experimental en Next.js 16; si algún día causa un problema real, `false` la
 * apaga en todo el sitio sin tocar ningún componente.
 */
const ENABLE_PAGE_TRANSITIONS = true;

/**
 * Envuelve el contenido de la página (no el Navbar ni el Footer, que quedan
 * fijos): al navegar, lo que sale se desvanece en 150 ms y lo que entra sube
 * 8 px y aparece en 250 ms (clases `page-out`/`page-in` en globals.css). El
 * `key={pathname}` es lo que hace que cada ruta cuente como entrada/salida en
 * vez de una actualización. `default="none"` evita que cualquier otro elemento
 * anime por su cuenta; los pares `morph` del portafolio y los servicios siguen
 * funcionando porque tienen nombre propio. Sin soporte del navegador o con
 * reduced motion, la navegación funciona igual sin animación.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!ENABLE_PAGE_TRANSITIONS) return <>{children}</>;

  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
