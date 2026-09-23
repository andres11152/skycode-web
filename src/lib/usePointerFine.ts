"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: fine)";

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** En el servidor no hay puntero — `false` para que el primer render del cliente coincida y no rompa la hidratación. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * `true` cuando el dispositivo tiene un puntero preciso (mouse/trackpad),
 * `false` en táctil. Lo usan `Magnetic` y `TiltCard` para desactivarse por
 * completo en móvil, donde un efecto que depende de seguir el cursor no
 * tiene sentido.
 *
 * Con `useSyncExternalStore` y no con `useState` + `useEffect`: ese patrón
 * dispara la regla de lint `react-hooks/set-state-in-effect` (llamar a
 * setState de forma síncrona dentro de un efecto provoca un render en
 * cascada) y además se quedaba congelado — si alguien conecta un mouse a
 * una tablet, `matchMedia` emite un `change` que aquel patrón ignoraba.
 * Esta API está hecha exactamente para suscribirse a estado externo del
 * navegador y es segura en SSR vía `getServerSnapshot`.
 */
export function usePointerFine(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
