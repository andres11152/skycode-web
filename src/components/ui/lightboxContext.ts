"use client";

import { createContext, useContext } from "react";

// Aparte de Lightbox.tsx a propósito: los slides (que sí viajan en el JS inicial de la
// página) leen este contexto, y si lo importaran desde Lightbox.tsx arrastrarían todo el
// visor al paquete inicial en vez de dejarlo en su carga diferida.
export const LightboxZoomContext = createContext(false);

/** `true` mientras el visor está ampliado: un slide puede pedir entonces su variante de mayor resolución. */
export function useLightboxZoomed(): boolean {
  return useContext(LightboxZoomContext);
}
