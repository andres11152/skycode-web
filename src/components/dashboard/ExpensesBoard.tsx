"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Wallet, Plus, Search, ChevronLeft, ChevronRight, Trash2, Receipt } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import type { Expense, ExpenseCategory, Project } from "./types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  licencias: "Licencias",
  infraestructura: "Infraestructura",
  subcontratos: "Subcontratos",
  otro: "Otro",
};

const CATEGORY_TONES: Record<ExpenseCategory, BadgeTone> = {
  licencias: "info",
  infraestructura: "warning",
  subcontratos: "danger",
  otro: "neutral",
};

interface ExpensesBoardProps {
  expenses: Expense[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  category: string;
  totalThisMonthCop: number;
  projects: Pick<Project, "id" | "title" | "client">[];
  canWrite: boolean;
}

export function ExpensesBoard({ expenses, total, page, pageSize, q, category, totalThisMonthCop, projects, canWrite }: ExpensesBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchInput(q);
  }
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQuery = (overrides: Partial<{ q: string; category: string; page: number }>) => {
    const nextQ = overrides.q ?? q;
    const nextCategory = overrides.category ?? category;
    const resetPage = overrides.q !== undefined || overrides.category !== undefined;
    const nextPage = overrides.page ?? (resetPage ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextCategory !== "ALL") params.set("category", nextCategory);
    if (nextPage > 1) params.set("page", String(nextPage));

    startNavigation(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => pushQuery({ q: value }), 400);
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`¿Eliminar el gasto "${expense.description}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(expense.id);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gastos</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Costos que no son horas ni pauta — licencias, infraestructura, subcontratos y otros gastos operativos.
          </p>
        </div>
        {canWrite && (
          <Button variant="accent" onClick={() => setCreateOpen(true)} className="self-start sm:self-auto">
            <Plus size={14} />
            <span>Nuevo gasto</span>
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2 max-w-xs">
        <div className="flex items-center justify-between text-xs text-foreground/60">
          <span>Gastado Este Mes</span>
          <Wallet size={16} className="text-amber-700" />
        </div>
        <div className="text-xl font-bold font-mono text-amber-700">{formatMoney(totalThisMonthCop, "COP")}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background border border-foreground/10 shadow-sm shadow-black/5 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por descripción o proyecto..."
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-foreground/60 outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-foreground/60 font-mono">Categoría:</span>
          <select
            value={category}
            onChange={(e) => pushQuery({ category: e.target.value })}
            className="rounded-xl border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            <option value="ALL" className="bg-background text-foreground">Todas las categorías</option>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
              <option key={c} value={c} className="bg-background text-foreground">{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin gastos"
            description={total === 0 ? "Todavía no se ha registrado ningún gasto." : "Intente ajustar los filtros de búsqueda."}
            action={canWrite && total === 0 ? { label: "Nuevo gasto", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Gastos operativos de la agencia, con proyecto, categoría y monto</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Descripción</th>
                    <th scope="col" className="px-5 py-3.5">Proyecto</th>
                    <th scope="col" className="px-5 py-3.5">Categoría</th>
                    <th scope="col" className="px-5 py-3.5">Monto</th>
                    <th scope="col" className="px-5 py-3.5">Fecha</th>
                    {canWrite && <th scope="col" className="px-5 py-3.5 sr-only">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-5 py-3.5 font-medium text-foreground">{expense.description}</td>
                      <td className="px-5 py-3.5 text-foreground/70">{expense.project_title ?? <span className="text-foreground/40">General</span>}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={CATEGORY_TONES[expense.category]}>{CATEGORY_LABELS[expense.category]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground">{formatMoney(expense.amount, expense.currency)}</td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-foreground/60 whitespace-nowrap">
                        {new Date(expense.expense_date).toLocaleDateString("es-CO", { timeZone: "UTC" })}
                      </td>
                      {canWrite && (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(expense)}
                            disabled={deletingId === expense.id}
                            aria-label={`Eliminar ${expense.description}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 text-foreground/60 hover:border-red-500/30 hover:text-red-700 hover:bg-red-500/10 transition-all disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-foreground/10 px-5 py-3.5 text-xs text-foreground/60 font-mono">
              <div>
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} gastos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pushQuery({ page: page - 1 })}
                  disabled={page === 1 || isNavigating}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 hover:bg-foreground/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => pushQuery({ page: page + 1 })}
                  disabled={page === totalPages || isNavigating}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 hover:bg-foreground/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {createOpen && <CreateExpenseModal projects={projects} onClose={() => setCreateOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function CreateExpenseModal({
  projects,
  onClose,
}: {
  projects: Pick<Project, "id" | "title" | "client">[];
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [projectId, setProjectId] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("otro");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId ? Number(projectId) : null,
          category,
          description,
          amount: Number(amount),
          currency,
          expense_date: expenseDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el gasto.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al crear el gasto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Nuevo gasto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Proyecto (opcional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            <option value="" className="bg-background text-foreground">General (sin proyecto)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-background text-foreground">
                {p.title} — {p.client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
              <option key={c} value={c} className="bg-background text-foreground">{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Descripción</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Licencia anual de Figma"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Monto</label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
              />
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Fecha</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
            />
          </div>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Creando..." : "Crear gasto"}
        </Button>
      </form>
    </ModalShell>
  );
}
