"use client";

import { useId, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Zona de subida única del panel: arrastrar y soltar, o clic/Enter/Espacio
 * (el `<input type="file">` real queda dentro, visualmente oculto, así que el
 * foco de teclado y los lectores de pantalla funcionan igual). Muestra los
 * formatos y el tamaño máximo ANTES de subir y valida el tamaño en el cliente
 * para no mandar al servidor un archivo que va a rechazar.
 */
export function FileDropzone({
  accept,
  maxBytes,
  label,
  hint,
  busy,
  disabled,
  onFile,
  onReject,
  className,
}: {
  /** Mismo formato que el atributo `accept` del input. */
  accept: string;
  maxBytes: number;
  label: string;
  /** Formatos aceptados, en lenguaje humano ("PNG, JPG o WebP"). */
  hint: string;
  busy?: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
  onReject?: (message: string) => void;
  className?: string;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const inactive = Boolean(busy || disabled);

  const accepts = (file: File) => {
    const rules = accept.split(",").map((r) => r.trim().toLowerCase());
    const name = file.name.toLowerCase();
    return rules.some((r) => (r.endsWith("/*") ? file.type.startsWith(r.slice(0, -1)) : r.startsWith(".") ? name.endsWith(r) : file.type === r));
  };

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!accepts(file)) return onReject?.(`Formato no admitido. Usa ${hint}.`);
    if (file.size > maxBytes) return onReject?.(`El archivo pesa ${(file.size / 1_048_576).toFixed(1)} MB; el máximo es ${(maxBytes / 1_048_576).toFixed(0)} MB.`);
    onFile(file);
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        if (inactive) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!inactive) take(e.dataTransfer.files[0]);
      }}
      className={cn(
        "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background",
        dragging ? "border-accent bg-accent/5" : "border-foreground/20 hover:border-foreground/35 hover:bg-foreground/[0.02]",
        inactive && "pointer-events-none opacity-60",
        className,
      )}
    >
      <UploadCloud size={20} className="text-accent-strong" aria-hidden="true" />
      <span className="text-sm font-semibold text-foreground">{busy ? "Subiendo…" : label}</span>
      <span className="text-xs text-foreground/70">
        {hint} · máx. {(maxBytes / 1_048_576).toFixed(0)} MB
      </span>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={inactive}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
