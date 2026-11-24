"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  Pencil,
  Save,
  X,
  Layers,
  FileText,
  Receipt,
  Download,
  ShieldAlert,
  UserX,
  KeyRound,
  Copy,
  Trash2,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "./EmptyState";
import { ClientActivityLog } from "./ClientActivityLog";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { formatMoney, formatShortDate } from "@/lib/utils";
import { logError } from "@/lib/logger";
import type { ClientActivity, ClientDetail } from "./types";
import { INVOICE_STATUS, PROJECT_STATUS, PROPOSAL_STATUS } from "./statusMeta";
import { useFeedback } from "./ui/Feedback";
import { PageBack } from "./ui/PageHeader";

export function ClientDetailView({
  client,
  canWrite,
  canManagePrivacy,
  portalUsers,
  pendingInvite,
  canDelete,
  initialActivities,
}: {
  client: ClientDetail;
  canWrite: boolean;
  canManagePrivacy: boolean;
  portalUsers: Array<{ id: number; email: string; status: string }>;
  pendingInvite: { id: string; email: string; expiresAt: string } | null;
  canDelete: boolean;
  initialActivities: ClientActivity[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: client.name,
    email: client.email,
    company: client.company ?? "",
    phone: client.phone ?? "",
    notes: client.notes,
  });
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const feedback = useFeedback();

  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; emailSent: boolean; email: string } | null>(null);
  const handlePortalInvite = async () => {
    setInviting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/portal-invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        feedback.toast({ tone: "error", message: data.error || "No se pudo crear la invitación." });
        return;
      }
      setInviteResult({ url: data.inviteUrl, emailSent: Boolean(data.emailSent), email: data.email });
      feedback.toast({ message: data.emailSent ? "Invitación enviada por correo." : "Invitación creada. Copia el enlace y envíaselo." });
    } catch (err) {
      logError("Error al invitar al portal", err);
      feedback.toast({ tone: "error", message: "Error de red al crear la invitación." });
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async () => {
    const ok = await feedback.confirm({
      title: "Revocar invitación",
      description: "El enlace que ya enviaste dejará de funcionar. Puedes crear uno nuevo cuando quieras.",
      confirmLabel: "Revocar",
      tone: "danger",
    });
    if (!ok) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/portal-invite`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        feedback.toast({ tone: "error", message: data.error || "No se pudo revocar la invitación." });
        return;
      }
      setInviteResult(null);
      feedback.toast({ message: "Invitación revocada." });
      router.refresh();
    } catch (err) {
      logError("Error al revocar invitación", err);
      feedback.toast({ tone: "error", message: "Error de red al revocar la invitación." });
    } finally {
      setInviting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: client.id,
          name: form.name,
          company: form.company,
          phone: form.phone,
          notes: form.notes,
          ...(form.email.trim().toLowerCase() !== client.email.toLowerCase() ? { email: form.email.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el cliente.");
        return;
      }
      setIsEditing(false);
      feedback.toast({ message: "Cliente actualizado." });
      router.refresh();
    } catch {
      setError("Ocurrió un error de red. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageBack href="/dashboard/clientes" label="Volver a clientes" />

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            {isEditing ? (
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full max-w-sm rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-1.5 text-xl font-bold text-foreground outline-none focus:border-accent"
                aria-label="Nombre del cliente"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground/70">
              {isEditing && !client.anonymized_at ? (
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-foreground/70" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      aria-label="Correo del cliente"
                      aria-describedby="client-email-hint"
                      autoComplete="off"
                      className="min-h-11 w-full min-w-0 rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-accent sm:w-72"
                    />
                  </span>
                  <span id="client-email-hint" className="text-[11px] text-foreground/70">
                    Al cambiarlo se actualizan sus propuestas y se revocan las invitaciones pendientes al portal.
                  </span>
                </span>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5 break-all font-mono">
                  <Mail size={13} className="text-foreground/70" />
                  {client.email}
                </span>
              )}
              {isEditing ? (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-foreground/70" />
                  <input
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Empresa"
                    aria-label="Empresa"
                    autoComplete="organization"
                    className="min-h-11 rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </span>
              ) : (
                client.company && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-foreground/70" />
                    {client.company}
                  </span>
                )
              )}
              {isEditing ? (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-foreground/70" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Teléfono"
                    aria-label="Teléfono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="min-h-11 rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </span>
              ) : (
                client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-foreground/70" />
                    {client.phone}
                  </span>
                )
              )}
            </div>
          </div>

          {canWrite && (
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="accent" onClick={handleSave} disabled={isSaving}>
                    <Save size={13} />
                    Guardar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setForm({ name: client.name, email: client.email, company: client.company ?? "", phone: client.phone ?? "", notes: client.notes });
                    }}
                  >
                    <X size={13} />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil size={13} />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 border-t border-foreground/10 pt-4">
            <label htmlFor="client-notes" className="text-xs font-medium text-foreground/70">
              Notas internas
            </label>
            <textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>
        )}

        {!isEditing && client.notes && (
          <p className="mt-4 border-t border-foreground/10 pt-4 text-xs text-foreground/70 whitespace-pre-wrap">
            {client.notes}
          </p>
        )}

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </div>

      {canWrite && (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-foreground/70">
            <KeyRound size={14} />
            Acceso al portal del cliente
          </h2>
          {portalUsers.length > 0 ? (
            <ul className="space-y-1 text-xs text-foreground/80">
              {portalUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-2 font-mono">
                  {u.email}
                  <Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status === "active" ? "Activo" : "Desactivado"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-foreground/70">
              Desde el portal este cliente ve el avance de sus proyectos, abre tickets de soporte, sube documentos, revisa facturas y aprueba
              entregables. Le enviamos un enlace a <span className="font-mono">{client.email}</span> para que cree su contraseña.
            </p>
          )}
          {portalUsers.length === 0 && pendingInvite && !inviteResult && (
            <p className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-foreground/80">
              Invitación pendiente enviada a <span className="font-mono">{pendingInvite.email}</span>. Vence el {formatShortDate(pendingInvite.expiresAt)}.
            </p>
          )}
          {portalUsers.length === 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" onClick={handlePortalInvite} disabled={inviting}>
                <KeyRound size={13} />
                {inviting ? "Creando invitación..." : pendingInvite ? "Reenviar invitación" : "Invitar al portal"}
              </Button>
              {pendingInvite && (
                <Button variant="secondary" onClick={handleRevokeInvite} disabled={inviting}>
                  <X size={13} />
                  Revocar enlace
                </Button>
              )}
            </div>
          )}
          {inviteResult && (
            <Alert tone="success">
              <p>
                {inviteResult.emailSent
                  ? `Enviamos el enlace a ${inviteResult.email}. También lo puedes copiar (válido 7 días):`
                  : `El correo no se pudo enviar. Copia este enlace y envíaselo a ${inviteResult.email} (válido 7 días):`}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={inviteResult.url} aria-label="Enlace de invitación" className="min-h-11 w-full rounded-lg border border-foreground/20 bg-background px-3 text-xs font-mono text-foreground" />
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteResult.url).then(
                      () => feedback.toast({ message: "Enlace copiado." }),
                      () => feedback.toast({ tone: "error", message: "No se pudo copiar." })
                    );
                  }}
                >
                  <Copy size={13} />
                  Copiar
                </Button>
              </div>
            </Alert>
          )}
        </div>
      )}

      {canDelete && !client.anonymized_at && (
        <div className="rounded-xl border border-danger/25 bg-background shadow-sm shadow-black/5 p-5 space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-danger">
            <Trash2 size={14} />
            Eliminar cliente
          </h2>
          {client.projects.length > 0 ? (
            <p className="text-xs text-foreground/70">
              No se puede eliminar: tiene {client.projects.length} proyecto(s) con su facturación. Esos registros se conservan por obligación
              contable; para quitar sus datos personales usa <span className="font-semibold">Anonimizar</span>.
            </p>
          ) : (
            <>
              <p className="text-xs text-foreground/70">
                Úsalo para un cliente creado por error (por ejemplo, con el correo mal escrito). Se elimina de forma permanente junto con su
                cuenta de portal, sus invitaciones y su bitácora. Si solo te equivocaste en el correo, edítalo con el botón Editar.
              </p>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-danger/30 px-4 text-xs font-medium text-danger hover:bg-danger/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Trash2 size={13} />
                Eliminar cliente
              </button>
            </>
          )}
        </div>
      )}

      {canManagePrivacy && (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-foreground/70">
            <ShieldAlert size={15} className="text-accent" />
            Privacidad de datos
          </h2>
          {client.anonymized_at ? (
            <p className="text-xs text-foreground/70">
              Este cliente fue anonimizado el {formatShortDate(client.anonymized_at)} — su nombre, correo, teléfono y notas ya no son recuperables.
            </p>
          ) : (
            <p className="text-xs text-foreground/70">
              Exporta todo lo que tenemos sobre este cliente (derecho de portabilidad), o anonimiza su información personal (derecho al olvido) — proyectos, facturas y pagos se conservan como registro contable, solo dejan de estar atados a un nombre real.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/clients/${client.id}/export`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-foreground/15 px-4 text-xs font-medium text-foreground hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Download size={13} />
              Exportar datos (JSON)
            </a>
            {!client.anonymized_at && (
              <button
                type="button"
                onClick={() => setAnonymizeOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-danger/30 px-4 text-xs font-medium text-danger hover:bg-danger/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <UserX size={13} />
                Anonimizar cliente
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/70">
              <span>Proyectos</span>
              <Layers size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">{client.projects.length}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/70">
              <span>Facturado total</span>
              <Receipt size={18} className="text-success" />
            </div>
            <div className="text-lg font-bold font-mono text-success">{formatMoney(client.totalBilledCop, "COP")}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/70">
              <span>Saldo pendiente</span>
              <Receipt size={18} className="text-warning" />
            </div>
            <div className="text-lg font-bold font-mono text-warning">{formatMoney(client.totalOutstandingCop, "COP")}</div>
          </div>
        </SpotlightCard>
      </div>

      <section aria-labelledby="client-projects-heading" className="space-y-3">
        <h2 id="client-projects-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/70">
          Proyectos
        </h2>
        {client.projects.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={Layers} title="Sin proyectos" description="Este cliente todavía no tiene proyectos." />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {client.projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-foreground truncate">{project.title}</span>
                  <Badge tone={PROJECT_STATUS[project.status].tone} className="shrink-0">
                    {project.status}
                  </Badge>
                </div>
                <div className="h-1.5 w-full rounded-full bg-foreground/15 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="text-[11px] text-foreground/70 font-mono">{project.progress}% completado</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="client-proposals-heading" className="space-y-3">
        <h2 id="client-proposals-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/70">
          Propuestas
        </h2>
        {client.proposals.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={FileText} title="Sin propuestas" description="Este cliente todavía no recibió propuestas." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Propuestas comerciales enviadas a este cliente</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                  <tr>
                    <th scope="col" className="px-5 py-3">Título</th>
                    <th scope="col" className="px-5 py-3">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {client.proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-5 py-3 font-medium text-foreground">{proposal.title}</td>
                      <td className="px-5 py-3">
                        <Badge tone={PROPOSAL_STATUS[proposal.status].tone}>{PROPOSAL_STATUS[proposal.status].label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-foreground">
                        {formatMoney(proposal.total, proposal.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="client-invoices-heading" className="space-y-3">
        <h2 id="client-invoices-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/70">
          Facturas
        </h2>
        {client.invoices.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={Receipt} title="Sin facturas" description="Este cliente todavía no tiene facturas." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Facturas emitidas a este cliente, con su saldo pendiente</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                  <tr>
                    <th scope="col" className="px-5 py-3">Proyecto</th>
                    <th scope="col" className="px-5 py-3">Descripción</th>
                    <th scope="col" className="px-5 py-3">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {client.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-5 py-3 font-medium text-foreground">{invoice.project_title}</td>
                      <td className="px-5 py-3 text-foreground/70 truncate max-w-xs">{invoice.description}</td>
                      <td className="px-5 py-3">
                        <Badge tone={INVOICE_STATUS[invoice.status].tone}>{INVOICE_STATUS[invoice.status].label}</Badge>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono font-bold ${
                          invoice.balance > 0 ? "text-warning" : "text-foreground/70"
                        }`}
                      >
                        {formatMoney(invoice.balance, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <ClientActivityLog clientId={client.id} initialActivities={initialActivities} canWrite={canWrite} />

      <DeleteClientModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        clientId={client.id}
        clientName={client.name}
      />

      <AnonymizeClientModal
        open={anonymizeOpen}
        onClose={() => setAnonymizeOpen(false)}
        clientId={client.id}
        clientName={client.name}
      />
    </div>
  );
}

/**
 * Exige escribir el nombre exacto del cliente antes de habilitar el
 * botón — mismo criterio que confirmar borrar un repositorio en GitHub:
 * la fricción extra es deliberada, esta acción es irreversible y no hay
 * ningún endpoint para deshacerla.
 */
function AnonymizeClientModal({
  open,
  onClose,
  clientId,
  clientName,
}: {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setConfirmText("");
    setError(null);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/anonymize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo anonimizar el cliente.");
        return;
      }
      handleClose();
      router.refresh();
    } catch (err) {
      logError("Error al anonimizar cliente", err);
      setError("Ocurrió un error de red al anonimizar el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Anonimizar cliente" closeLabel="Cerrar">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert size={18} />
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Esto reemplaza el nombre, correo, teléfono y notas de <span className="font-semibold text-foreground">{clientName}</span> por
            valores genéricos, de forma permanente — no se puede deshacer. Sus proyectos, facturas y pagos se conservan intactos como
            registro contable, solo dejan de estar atados a esta identidad.
          </p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block text-xs font-semibold text-foreground/80">
            Escribe <span className="font-mono">{clientName}</span> para confirmar
          </label>
          <input
            id={inputId}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-11 items-center rounded-xl border border-foreground/20 px-4 py-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmText !== clientName || isSubmitting}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-90 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <UserX size={14} />
            {isSubmitting ? "Anonimizando…" : "Anonimizar definitivamente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}


/** Exige escribir el nombre del cliente antes de eliminarlo (misma barrera que "anonimizar"). */
function DeleteClientModal({ open, onClose, clientId, clientName }: { open: boolean; onClose: () => void; clientId: number; clientName: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const inputId = useId();
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setConfirmText("");
    setError(null);
  };

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo eliminar el cliente.");
        return;
      }
      feedback.toast({ message: "Cliente eliminado." });
      router.push("/dashboard/clientes");
      router.refresh();
    } catch (err) {
      logError("Error al eliminar cliente", err);
      setError("Ocurrió un error de red al eliminar el cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Eliminar cliente" closeLabel="Cerrar">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground/80 leading-relaxed">
          Vas a eliminar a <span className="font-semibold text-foreground">{clientName}</span> de forma permanente, junto con su cuenta de
          portal, invitaciones y bitácora. No se puede deshacer.
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block text-xs font-semibold text-foreground/80">
            Escribe <span className="font-mono">{clientName}</span> para confirmar
          </label>
          <input
            id={inputId}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancelar</Button>
          <button
            type="button"
            onClick={confirm}
            disabled={confirmText !== clientName || submitting}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-90 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Trash2 size={14} />
            {submitting ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
