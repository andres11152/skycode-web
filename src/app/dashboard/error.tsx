"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/ui/ErrorState";
import { logError } from "@/lib/logger";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("❌ [Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <ErrorState
      title="No se pudo cargar esta sección"
      description="Algo falló al consultar la base de datos o procesar la solicitud. Intenta de nuevo; si el problema continúa, comparte la referencia con el equipo técnico."
      digest={error.digest}
      onRetry={reset}
      homeHref="/dashboard"
      homeLabel="Ir al inicio del panel"
    />
  );
}
