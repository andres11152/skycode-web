"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Building2, Search, ChevronLeft, ChevronRight, ArrowRight, Layers, Receipt } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { EmptyState } from "./EmptyState";
import { formatMoney } from "@/lib/utils";
import type { Client } from "./types";

interface ClientsTableProps {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
}

export function ClientsTable({ clients, total, page, pageSize, q }: ClientsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();

  const [searchInput, setSearchInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchInput(q);
  }

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQuery = (overrides: Partial<{ q: string; page: number }>) => {
    const nextQ = overrides.q ?? q;
    const resetPage = overrides.q !== undefined;
    const nextPage = overrides.page ?? (resetPage ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextPage > 1) params.set("page", String(nextPage));

    startNavigation(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => pushQuery({ q: value }), 400);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-background">Clientes</h1>
        <p className="mt-1 text-xs text-background/70 font-sans">
          Directorio de clientes — proyectos, facturación y saldo pendiente en una vista
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Total Clientes</span>
              <Building2 size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-background">{total}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Facturado (esta página)</span>
              <Receipt size={18} className="text-green-400" />
            </div>
            <div className="text-lg font-bold font-mono text-green-400">
              {formatMoney(clients.reduce((sum, c) => sum + c.totalBilledCop, 0), "COP")}
            </div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Saldo pendiente (esta página)</span>
              <Layers size={18} className="text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {formatMoney(clients.reduce((sum, c) => sum + c.totalOutstandingCop, 0), "COP")}
            </div>
          </div>
        </SpotlightCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background/5 border border-background/15 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/60" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, correo o empresa..."
            className="w-full rounded-xl border border-background/15 bg-background/10 py-2 pl-10 pr-4 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
        {clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No se encontraron clientes"
            description={total === 0 ? "Todavía no hay clientes registrados." : "Intente ajustar la búsqueda."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-background/90">
                <caption className="sr-only">Directorio de clientes con proyectos activos, facturado y saldo pendiente</caption>
                <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Cliente</th>
                    <th scope="col" className="px-5 py-3.5">Empresa</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Proyectos</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Facturado</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Saldo pendiente</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background/10">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-background/10 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-background">{client.name}</div>
                        <div className="text-[11px] text-background/60 font-mono">{client.email}</div>
                      </td>
                      <td className="px-5 py-4 text-background/80">{client.company || "—"}</td>
                      <td className="px-5 py-4 text-center font-mono">{client.projectCount}</td>
                      <td className="px-5 py-4 text-right font-mono text-background">
                        {formatMoney(client.totalBilledCop, "COP")}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          client.totalOutstandingCop > 0 ? "text-amber-400" : "text-background/50"
                        }`}
                      >
                        {formatMoney(client.totalOutstandingCop, "COP")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/clientes/${client.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-background/15 px-3 py-1.5 text-[11px] font-semibold text-background hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                        >
                          Ver ficha
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-background/10 px-5 py-3.5 text-xs text-background/60 font-mono">
              <div>
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pushQuery({ page: page - 1 })}
                  disabled={page === 1 || isNavigating}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => pushQuery({ page: page + 1 })}
                  disabled={page === totalPages || isNavigating}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
