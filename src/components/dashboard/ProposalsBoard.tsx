"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { FileText, Plus, RefreshCw, Copy, Check, Trash2, LayoutTemplate } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { logError } from "@/lib/logger";
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import type { Proposal, ProposalStatus, ProposalTemplate } from "./types";

const STATUS_LABELS: Record<ProposalStatus, string> = {
  sent: "Enviada",
  viewed: "Vista",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

const STATUS_TONES: Record<ProposalStatus, BadgeTone> = {
  sent: "info",
  viewed: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

interface DraftItem {
  description: string;
  quantity: string;
  unit_price: string;
}

const EMPTY_ITEM: DraftItem = { description: "", quantity: "1", unit_price: "" };

export function ProposalsBoard({
  initialProposals,
  origin,
  defaultTaxRatePct,
}: {
  initialProposals: Proposal[];
  origin: string;
  defaultTaxRatePct: number;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [prevInitial, setPrevInitial] = useState(initialProposals);
  if (initialProposals !== prevInitial) {
    setPrevInitial(initialProposals);
    setProposals(initialProposals);
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRefresh = () => startRefresh(() => router.refresh());

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`${origin}/propuesta/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Propuestas Comerciales</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Enlace público por propuesta — el cliente ve, acepta o rechaza sin necesitar cuenta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </Button>
          <Button variant="secondary" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate size={14} />
            <span>Plantillas</span>
          </Button>
          <Button variant="accent" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            <span>Nueva Propuesta</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin propuestas todavía"
            description="Crea la primera para empezar a cerrar proyectos."
            action={{ label: "Nueva Propuesta", onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th className="px-5 py-3.5">Propuesta / Cliente</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Vigencia</th>
                  <th className="px-5 py-3.5 text-right">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {proposals.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground">{p.title}</div>
                      <div className="text-[11px] text-foreground/60 font-mono">{p.client_name} · {p.client_email}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-green-700">
                      {formatMoney(p.total, p.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONES[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-foreground/60">
                      {p.valid_until ? new Date(p.valid_until).toLocaleDateString("es-CO") : "Sin vencimiento"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleCopy(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {copiedId === p.id ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
                        <span>{copiedId === p.id ? "Copiado" : "Copiar enlace"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && <CreateProposalModal onClose={() => setCreateOpen(false)} defaultTaxRatePct={defaultTaxRatePct} />}
        {templatesOpen && <ManageTemplatesModal onClose={() => setTemplatesOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/**
 * Lista las plantillas guardadas con opción de borrarlas — no las edita
 * (para cambiar una, se borra y se guarda una nueva desde el formulario de
 * "Nueva propuesta"). Separado de `CreateProposalModal` porque no
 * comparte estado con él: es una vista de administración aparte, no un
 * paso del flujo de creación.
 */
function ManageTemplatesModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [templates, setTemplates] = useState<ProposalTemplate[] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proposal-templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch((err) => {
        logError("Error al cargar plantillas de propuesta", err);
        setTemplates([]);
      });
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/proposal-templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo eliminar la plantilla.");
        return;
      }
      setTemplates((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
    } catch {
      setError("Ocurrió un error de red al eliminar la plantilla.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Plantillas de propuesta" onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        {templates === null ? (
          <p className="py-6 text-center text-xs text-foreground/50">Cargando…</p>
        ) : templates.length === 0 ? (
          <p className="py-6 text-center text-xs text-foreground/50">
            Sin plantillas todavía — guarda una desde el formulario de &quot;Nueva propuesta&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {templates.map((t) => {
              const subtotal = t.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
              const total = subtotal * (1 + t.tax_rate / 100);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{t.name}</p>
                    <p className="text-[11px] text-foreground/60">
                      {t.items.length} {t.items.length === 1 ? "partida" : "partidas"} · {formatMoney(total, t.currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    aria-label={`Eliminar plantilla ${t.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-500/10 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}

function CreateProposalModal({ onClose, defaultTaxRatePct }: { onClose: () => void; defaultTaxRatePct: number }) {
  const router = useRouter();
  const titleId = useId();
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [taxRate, setTaxRate] = useState(String(defaultTaxRatePct));
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposalUrl, setProposalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Plantillas: solo un punto de partida para las partidas/IVA/moneda del
  // formulario — no se referencian de vuelta, cargar una es "copiar sus
  // valores acá", nada más (ver comentario de la migración 0025).
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  useEffect(() => {
    fetch("/api/proposal-templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch((err) => logError("Error al cargar plantillas de propuesta", err));
  }, []);

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === Number(templateId));
    if (!template) return;
    setCurrency(template.currency);
    setTaxRate(String(template.tax_rate));
    setItems(
      template.items.map((it) => ({
        description: it.description,
        quantity: String(it.quantity),
        unit_price: String(it.unit_price),
      }))
    );
  };

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);

  const handleSaveTemplate = async () => {
    const validItems = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
      }));
    if (!templateName.trim() || validItems.length === 0) return;

    setTemplateSaveError(null);
    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/proposal-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim(), currency, tax_rate: Number(taxRate) || 0, items: validItems }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTemplateSaveError(data.error || "No se pudo guardar la plantilla.");
        return;
      }
      setTemplateSaved(true);
      setSavingTemplate(false);
      setTemplateName("");
      setTimeout(() => setTemplateSaved(false), 2500);
    } catch {
      setTemplateSaveError("Ocurrió un error de red al guardar la plantilla.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const total = subtotal * (1 + (Number(taxRate) || 0) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_email: clientEmail,
          client_name: clientName,
          title,
          currency,
          tax_rate: Number(taxRate) || 0,
          valid_until: validUntil || undefined,
          items: items
            .filter((it) => it.description.trim())
            .map((it) => ({
              description: it.description,
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la propuesta.");
        return;
      }
      setProposalUrl(data.proposalUrl);
    } catch {
      setError("Ocurrió un error de red al crear la propuesta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!proposalUrl) return;
    navigator.clipboard.writeText(proposalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onClose();
    if (proposalUrl) router.refresh();
  };

  return (
    <ModalShell titleId={titleId} title="Nueva propuesta" onClose={handleClose} maxWidthClassName="max-w-xl">
      {proposalUrl ? (
        <div className="space-y-4">
          <p className="text-xs text-foreground/70">
            Propuesta creada. Compártele este enlace — también se intentó enviar por correo.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-foreground/10 p-3">
            <span className="flex-1 truncate text-xs font-mono text-foreground/90">{proposalUrl}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {copied ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
          <button
            onClick={handleClose}
            className="w-full rounded-xl border border-foreground/20 px-4 py-2.5 text-xs font-medium text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">Nombre del cliente</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">Correo del cliente</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-[1fr_7rem] gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">Título de la propuesta</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Plataforma de gestión de inventario"
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">Moneda</label>
              <CurrencySelect value={currency} onChange={setCurrency} className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer" />
            </div>
          </div>

          {templates.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">Cargar desde plantilla (opcional)</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                  e.target.value = "";
                }}
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
              >
                <option value="" className="bg-background text-foreground">Seleccionar plantilla…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-background text-foreground">
                    {t.name} ({t.items.length} {t.items.length === 1 ? "partida" : "partidas"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground/80">Partidas</label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  required
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  placeholder="Descripción"
                  className="flex-1 min-w-0 rounded-lg border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: e.target.value })}
                  className="w-16 rounded-lg border border-foreground/15 bg-foreground/10 py-2 px-2 text-xs text-foreground outline-none focus:border-accent font-mono"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: e.target.value })}
                  placeholder="Precio"
                  className="w-28 rounded-lg border border-foreground/15 bg-foreground/10 py-2 px-2 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent font-mono"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    aria-label="Quitar partida"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-500/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={addItem}
                className="text-[11px] font-semibold text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
              >
                + Agregar partida
              </button>
              {!savingTemplate && (
                <button
                  type="button"
                  onClick={() => setSavingTemplate(true)}
                  disabled={!items.some((it) => it.description.trim())}
                  className="flex items-center gap-1 text-[11px] font-semibold text-foreground/60 hover:text-foreground hover:underline disabled:opacity-40 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  <LayoutTemplate size={12} />
                  Guardar como plantilla
                </button>
              )}
            </div>

            {savingTemplate && (
              <div className="flex items-start gap-2 rounded-lg border border-foreground/15 bg-foreground/[0.02] p-2.5">
                <input
                  type="text"
                  autoFocus
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nombre de la plantilla (ej. Sitio institucional)"
                  className="flex-1 min-w-0 rounded-lg border border-foreground/15 bg-background py-2 px-3 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || !templateName.trim()}
                  className="shrink-0 rounded-lg bg-accent-strong px-3 py-2 text-[11px] font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {isSavingTemplate ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSavingTemplate(false);
                    setTemplateName("");
                    setTemplateSaveError(null);
                  }}
                  aria-label="Cancelar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  ×
                </button>
              </div>
            )}
            {templateSaveError && <p className="text-[11px] text-red-700">{templateSaveError}</p>}
            {templateSaved && <p className="text-[11px] text-green-700">Plantilla guardada.</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">IVA / Impuesto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80">Vigente hasta (opcional)</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-foreground/15 bg-foreground/10 p-3 text-xs font-mono">
            <span className="text-foreground/60">Total estimado</span>
            <span className="font-bold text-green-700">{formatMoney(total, currency)}</span>
          </div>

          <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
            {isSubmitting ? "Creando..." : "Crear propuesta"}
          </Button>
        </form>
      )}
    </ModalShell>
  );
}
