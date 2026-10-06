"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CornerDownLeft, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getVisibleGroups } from "./navConfig";

interface PaletteResult {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Paleta de comandos (⌘K / Ctrl+K): ir a cualquier módulo o buscar un cliente
 * sin recorrer los 28 ítems del menú. Reutiliza `ui/Modal` (foco atrapado,
 * fondo inerte, hoja inferior en móvil) y el patrón ARIA "combobox" con
 * `aria-activedescendant`: el foco se queda en el campo y las flechas mueven
 * la opción activa. Los módulos salen del mismo `navConfig` que el menú, así
 * que respetan los permisos del rol y nunca pueden desincronizarse.
 */
export function CommandPalette({ role, open, onClose }: { role: string; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [clients, setClients] = useState<PaletteResult[]>([]);

  const canSearchClients = hasPermission(role, "clients:read");

  const modules = useMemo<PaletteResult[]>(
    () =>
      getVisibleGroups(role).flatMap((group) =>
        group.items.map((item) => ({ id: item.href, label: item.label, hint: group.label, href: item.href, icon: item.icon })),
      ),
    [role],
  );

  const term = normalize(query.trim());
  const moduleMatches = useMemo(
    () => (term ? modules.filter((m) => normalize(`${m.label} ${m.hint}`).includes(term)) : modules),
    [modules, term],
  );

  // Clientes: búsqueda remota con espera, solo con 2+ letras.
  useEffect(() => {
    if (!open || !canSearchClients || term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { clients?: { id: number; name: string; company?: string | null; email: string }[] };
        setClients(
          (data.clients ?? []).slice(0, 5).map((c) => ({
            id: `client-${c.id}`,
            label: c.name,
            hint: c.company || c.email,
            href: `/dashboard/clientes/${c.id}`,
            icon: Building2,
          })),
        );
      } catch {
        // Cancelado o sin red: la lista de módulos sigue funcionando.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, canSearchClients, term, query]);

  // Con menos de 2 letras (o cerrada) se ignoran los clientes viejos sin tocar el estado.
  const showClients = open && canSearchClients && term.length >= 2;
  const results = useMemo(
    () => (showClients ? [...moduleMatches, ...clients] : moduleMatches),
    [moduleMatches, clients, showClients],
  );

  const go = (result: PaletteResult) => {
    onClose();
    router.push(result.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  const activeId = results[active] ? `${listId}-${active}` : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <Modal open={open} onClose={onClose} title="Buscar" closeLabel="Cerrar búsqueda" size="md" initialFocusRef={inputRef}>
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/70" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-label="Buscar módulos y clientes"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Ir a un módulo o buscar un cliente…"
            className="min-h-11 w-full rounded-xl border border-foreground/15 bg-foreground/[0.02] py-2.5 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-foreground/60 focus:border-accent"
          />
        </div>
        <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-[50dvh] space-y-0.5 overflow-y-auto">
          {results.map((result, index) => {
            const Icon = result.icon;
            const selected = index === active;
            return (
              <li
                key={result.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                onMouseMove={() => setActive(index)}
                onClick={() => go(result)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm",
                  selected ? "bg-accent/15 text-foreground" : "text-foreground/80",
                )}
              >
                <Icon size={16} className="shrink-0 text-foreground/70" />
                <span className="min-w-0 flex-1 truncate font-medium">{result.label}</span>
                <span className="shrink-0 text-xs text-foreground/70">{result.hint}</span>
                {selected && <CornerDownLeft size={12} aria-hidden="true" className="shrink-0 text-foreground/70" />}
              </li>
            );
          })}
        </ul>
        {results.length === 0 && (
          <p role="status" className="py-6 text-center text-xs text-foreground/70">
            Sin resultados para «{query.trim()}».
          </p>
        )}
        <p aria-hidden="true" className="hidden text-[11px] text-foreground/70 sm:block">
          ↑↓ para moverte · Enter para abrir · Esc para cerrar
        </p>
      </div>
    </Modal>
  );
}
