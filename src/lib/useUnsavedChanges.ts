"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Avisa antes de cerrar o recargar la pestaña con cambios sin guardar (el
 * navegador muestra su diálogo estándar). `value` es TODO el estado editable
 * del formulario; se compara contra una foto tomada al montar y tras cada
 * guardado (`markSaved`). Devuelve `dirty` para mostrar un indicador junto
 * al botón de guardar.
 *
 * No intercepta los enlaces internos de Next (App Router no tiene un guard de
 * navegación estable); por eso cada formulario además muestra "Cambios sin
 * guardar" a la vista.
 */
export function useUnsavedChanges(value: unknown): { dirty: boolean; markSaved: () => void } {
  const current = JSON.stringify(value);
  const [saved, setSaved] = useState(current);
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  });
  const dirty = current !== saved;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Lee el estado MÁS reciente (no el del render que creó el manejador): el guardado es asíncrono.
  const markSaved = useCallback(() => setSaved(latest.current), []);

  return { dirty, markSaved };
}
