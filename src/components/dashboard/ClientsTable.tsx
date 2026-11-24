"use client";

import { useId, useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Building2, Search, ArrowRight, Layers, Receipt, Plus } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { EmptyState } from "./EmptyState";
import { formatMoney } from "@/lib/utils";
import type { Client } from "./types";
import { Pagination } from "./ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { Field } from "./ui/Field";
import { useFeedback } from "./ui/Feedback";
import { logError } from "@/lib/logger";

interface ClientsTableProps {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  canWrite?: boolean;
}

export function ClientsTable({ clients, total, page, pageSize, q, canWrite = false }: ClientsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [newOpen, setNewOpen] = useState(false);

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


  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Directorio de clientes — proyectos, facturación y saldo pendiente en una vista
          </p>
        </div>
        {canWrite && (
          <Button variant="accent" onClick={() => setNewOpen(true)}>
            <Plus size={14} />
            Nuevo cliente
          </Button>
        )}
      </div>
      <NewClientModal open={newOpen} onClose={() => setNewOpen(false)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/70">
              <span>Total Clientes</span>
              <Building2 size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">{total}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/70">
              <span>Facturado (esta página)</span>
              <Receipt size={18} className="text-success" />
            </div>
            <div className="text-lg font-bold font-mono text-success">
              {formatMoney(clients.reduce((sum, c) => sum + c.totalBilledCop, 0), "COP")}
            </div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/70">
              <span>Saldo pendiente (esta página)</span>
              <Layers size={18} className="text-warning" />
            </div>
            <div className="text-lg font-bold font-mono text-warning">
              {formatMoney(clients.reduce((sum, c) => sum + c.totalOutstandingCop, 0), "COP")}
            </div>
          </div>
        </SpotlightCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background border border-foreground/10 shadow-sm shadow-black/5 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/70" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, correo o empresa..."
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-foreground/60 outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No se encontraron clientes"
            description={total === 0 ? "Todavía no hay clientes registrados." : "Intente ajustar la búsqueda."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Directorio de clientes con proyectos activos, facturado y saldo pendiente</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Cliente</th>
                    <th scope="col" className="px-5 py-3.5">Empresa</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Proyectos</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Facturado</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Saldo pendiente</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-foreground/10 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground">{client.name}</div>
                        <div className="text-[11px] text-foreground/70 font-mono">{client.email}</div>
                      </td>
                      <td className="px-5 py-4 text-foreground/80">{client.company || "—"}</td>
                      <td className="px-5 py-4 text-center font-mono">{client.projectCount}</td>
                      <td className="px-5 py-4 text-right font-mono text-foreground">
                        {formatMoney(client.totalBilledCop, "COP")}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          client.totalOutstandingCop > 0 ? "text-warning" : "text-foreground/70"
                        }`}
                      >
                        {formatMoney(client.totalOutstandingCop, "COP")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/clientes/${client.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-foreground/15 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

            <Pagination page={page} pageSize={pageSize} total={total} noun="registros" onPageChange={(next) => pushQuery({ page: next })} disabled={isNavigating} />
          </>
        )}
      </div>
    </div>
  );
}


function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const feedback = useFeedback();
  const baseId = useId();
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          ...(form.company.trim() ? { company: form.company } : {}),
          ...(form.phone.trim() ? { phone: form.phone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el cliente.");
        return;
      }
      feedback.toast({ message: "Cliente creado." });
      setForm({ name: "", email: "", company: "", phone: "" });
      onClose();
      router.push(`/dashboard/clientes/${data.client.id}`);
      router.refresh();
    } catch (err) {
      logError("Error al crear cliente", err);
      setError("Ocurrió un error de red al crear el cliente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Nuevo cliente" closeLabel="Cerrar">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field id={`${baseId}-name`} label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoComplete="off" />
        <Field
          id={`${baseId}-email`}
          label="Correo"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          hint="Es también el correo con el que entrará a su portal."
          required
          autoComplete="off"
        />
        <Field id={`${baseId}-company`} label="Empresa (opcional)" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} autoComplete="off" />
        <Field id={`${baseId}-phone`} label="Teléfono (opcional)" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="off" />
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={saving}>{saving ? "Creando..." : "Crear cliente"}</Button>
        </div>
      </form>
    </Modal>
  );
}
