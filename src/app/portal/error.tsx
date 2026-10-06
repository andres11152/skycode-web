"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/ui/ErrorState";
import { logError } from "@/lib/logger";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("❌ [Portal Error Boundary]", error);
  }, [error]);

  return (
    <ErrorState
      title="No pudimos cargar tu portal"
      description="Algo falló al obtener tu información. Intenta de nuevo; si el problema continúa, escríbenos y menciona la referencia de abajo."
      digest={error.digest}
      onRetry={reset}
      homeHref="/portal"
      homeLabel="Volver a tus proyectos"
      contactHref="mailto:contact@skycode.agency"
    />
  );
}
