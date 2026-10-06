"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Pestañas accesibles (patrón WAI-ARIA "tabs", activación automática):
 * `role="tablist"`/`tab`/`aria-selected`, una sola parada de Tab (`tabIndex`
 * itinerante) y flechas/Inicio/Fin para moverse. Antes eran `<nav>` con
 * `aria-current="page"` y `flex-wrap`, que en 375px partía 5 pestañas en 3
 * filas; ahora una sola fila con scroll horizontal (la activa se centra).
 *
 * Es controlada (`value`/`onChange`): quien la usa decide si guarda la pestaña
 * en la URL. El panel asociado debe llevar `id={tabPanelId(idBase, id)}` y
 * `role="tabpanel"` + `aria-labelledby={tabId(idBase, id)}`.
 */
export const tabId = (base: string, id: string) => `${base}-tab-${id}`;
export const tabPanelId = (base: string, id: string) => `${base}-panel-${id}`;

export function Tabs<T extends string>({
  idBase,
  label,
  items,
  value,
  onChange,
  className,
}: {
  idBase: string;
  label: string;
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const move = (to: number) => {
    const next = items[(to + items.length) % items.length];
    onChange(next.id);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[id="${tabId(idBase, next.id)}"]`);
      el?.focus();
      el?.scrollIntoView({ inline: "center", block: "nearest" });
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const current = items.findIndex((i) => i.id === value);
    if (e.key === "ArrowRight") move(current + 1);
    else if (e.key === "ArrowLeft") move(current - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(items.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("-mx-4 flex gap-1 overflow-x-auto border-b border-foreground/10 px-4 sm:mx-0 sm:px-0", className)}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={tabId(idBase, item.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(idBase, item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
              selected ? "text-foreground" : "text-foreground/70 hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
            {selected && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-strong" />}
          </button>
        );
      })}
    </div>
  );
}
