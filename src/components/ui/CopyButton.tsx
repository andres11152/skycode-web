"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons/UiIcons";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** Texto que se copia. */
  value: string;
  /** Etiqueta accesible del botón en reposo (ej. "Copiar contact@…"). */
  label: string;
  /** Texto anunciado a lectores de pantalla tras copiar (ej. "Copiado"). */
  copiedLabel: string;
  className?: string;
}

/**
 * Botón de ícono que copia `value` y confirma con el ícono (Copy → Check,
 * ~1.8 s) más un `role="status"` para lectores de pantalla — un cambio solo
 * visual de ícono no lo anuncia nadie. Objetivo táctil de 44×44. El cambio
 * de ícono es un fundido/escala CSS (opacity + transform), sin Motion.
 */
export function CopyButton({ value, label, copiedLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleClick() {
    if (!(await copyText(value))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const iconBase =
    "absolute inset-0 m-auto transition-[opacity,transform] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:active:scale-100",
          className,
        )}
      >
        <CopyIcon
          className={cn(iconBase, copied ? "scale-50 opacity-0" : "scale-100 opacity-100")}
        />
        <CheckIcon
          className={cn(iconBase, "text-accent-strong", copied ? "scale-100 opacity-100" : "scale-50 opacity-0")}
        />
      </button>
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
