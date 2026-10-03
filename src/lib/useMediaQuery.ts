"use client";

import { useSyncExternalStore } from "react";

/**
 * `true` mientras la media query coincide. Mismo patrón que
 * `usePointerFine` (`useSyncExternalStore`, `false` en el servidor para no
 * romper la hidratación): se usa para no montar en móvil algo que solo
 * existe en desktop — ej. el panel de vista previa del índice de
 * servicios, que así ni siquiera descarga el JS de las demos en un teléfono.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
