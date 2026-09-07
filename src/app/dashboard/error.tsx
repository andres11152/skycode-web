"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logError } from "@/lib/logger";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("❌ [Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-foreground text-background flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <h1 className="text-lg font-bold text-background">No se pudo cargar el panel</h1>
        <p className="text-xs text-background/60">
          Algo falló al conectar con la base de datos o procesar la solicitud. Intente de nuevo — si el
          problema persiste, contacte al equipo técnico.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          <RefreshCw size={14} />
          <span>Reintentar</span>
        </button>
      </div>
    </div>
  );
}
