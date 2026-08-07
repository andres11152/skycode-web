"use client";

import { useEffect } from "react";
import { captureAttributionOnce } from "@/lib/attribution";

/**
 * Se monta una sola vez en el layout público (no en /dashboard, /portal ni
 * /login — ahí no hay formularios de captación). Lee los UTMs/referrer de
 * la primera visita y los deja en localStorage para que Contact.tsx los
 * adjunte al enviar, sin importar cuánto navegue antes de convertir.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttributionOnce();
  }, []);

  return null;
}
