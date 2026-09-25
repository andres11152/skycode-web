"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Users2, RefreshCw, UserPlus, Copy, Check, Ban, PlayCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import type { Currency } from "@/lib/currency";
import type { TeamMember, TeamRole } from "./types";

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  traffiker: "Traffiker",
};

export function TeamTable({ initialMembers, currentUserId }: { initialMembers: TeamMember[]; currentUserId: number | string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("sales_manager");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null);
  // Ver LeadsTable.tsx: ajusta el estado durante el render en vez de un
  // useEffect+setState, para no disparar un render en cascada.
  const [prevInitialMembers, setPrevInitialMembers] = useState(initialMembers);
  if (initialMembers !== prevInitialMembers) {
    setPrevInitialMembers(initialMembers);
    setMembers(initialMembers);
  }

  const handleRefresh = () => startRefresh(() => router.refresh());

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setIsInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "No se pudo crear la invitación.");
        return;
      }
      setInviteUrl(data.inviteUrl);
    } catch {
      setInviteError("Ocurrió un error de red al enviar la invitación.");
    } finally {
      setIsInviting(false);
    }
  };

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("sales_manager");
    setInviteError(null);
    setInviteUrl(null);
  };

  const handleCopyInviteUrl = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (id: number, role: TeamRole) => {
    setBusyMemberId(id);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
      }
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleStatusToggle = async (member: TeamMember) => {
    const nextStatus = member.status === "active" ? "disabled" : "active";
    setBusyMemberId(member.id);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, status: nextStatus }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)));
      }
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleHourlyCostChange = async (id: number, hourlyCost: number | null, hourlyCostCurrency: Currency) => {
    setBusyMemberId(id);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hourlyCost, hourlyCostCurrency }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, hourly_cost: hourlyCost, hourly_cost_currency: hourlyCostCurrency } : m))
        );
      }
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleWeeklyHoursCapacityChange = async (id: number, weeklyHoursCapacity: number) => {
    setBusyMemberId(id);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, weeklyHoursCapacity }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, weekly_hours_capacity: weeklyHoursCapacity } : m)));
      }
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipo Interno</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Quién tiene acceso al panel y con qué rol.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </Button>
          <Button variant="accent" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} />
            <span>Invitar</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {members.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="Sin miembros"
            description="Invita a la primera persona a tu equipo."
            action={{ label: "Invitar", onClick: () => setInviteOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th className="px-5 py-3.5">Nombre / Email</th>
                  <th className="px-5 py-3.5">Rol</th>
                  <th className="px-5 py-3.5">Costo/Hora</th>
                  <th className="px-5 py-3.5">Horas/Semana</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Desde</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {members.map((member) => {
                  const isSelf = String(member.id) === String(currentUserId);
                  const isBusy = busyMemberId === member.id;
                  return (
                    <tr key={member.id}>
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>{member.name}</span>
                          {isSelf && (
                            <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] uppercase text-foreground/60">
                              Tú
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-foreground/60 font-mono">{member.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={member.role}
                          disabled={isSelf || isBusy}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                          className="rounded-lg border border-foreground/15 bg-foreground/10 px-2.5 py-1 text-[11px] font-semibold text-foreground outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {(Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => (
                            <option key={role} value={role} className="bg-background text-foreground">
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <HourlyCostCell
                          member={member}
                          disabled={isBusy}
                          onChange={(cost, currency) => handleHourlyCostChange(member.id, cost, currency)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <WeeklyHoursCapacityCell
                          member={member}
                          disabled={isBusy}
                          onChange={(hours) => handleWeeklyHoursCapacityChange(member.id, hours)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={member.status === "active" ? "success" : "danger"}>
                          {member.status === "active" ? "Activo" : "Desactivado"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-foreground/60">
                        {new Date(member.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleStatusToggle(member)}
                          disabled={isSelf || isBusy}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed ${
                            member.status === "active"
                              ? "border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/20"
                              : "border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20"
                          }`}
                        >
                          {member.status === "active" ? <Ban size={12} /> : <PlayCircle size={12} />}
                          <span>{member.status === "active" ? "Desactivar" : "Reactivar"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {inviteOpen && (
          <InviteModal
            email={inviteEmail}
            role={inviteRole}
            error={inviteError}
            inviteUrl={inviteUrl}
            isSubmitting={isInviting}
            copied={copied}
            onEmailChange={setInviteEmail}
            onRoleChange={setInviteRole}
            onSubmit={handleInviteSubmit}
            onCopyUrl={handleCopyInviteUrl}
            onClose={closeInviteModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Costo/hora editable en línea: guarda al perder el foco del monto o al
 * cambiar la moneda. Solo lo consume el reporte de rentabilidad (admin) —
 * nadie más ve esta columna porque `/dashboard/equipo` ya es admin-only.
 */
function HourlyCostCell({
  member,
  disabled,
  onChange,
}: {
  member: TeamMember;
  disabled: boolean;
  onChange: (cost: number | null, currency: Currency) => void;
}) {
  const [draft, setDraft] = useState(member.hourly_cost !== null ? String(member.hourly_cost) : "");

  const commit = () => {
    const parsed = draft.trim() === "" ? null : Number(draft);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setDraft(member.hourly_cost !== null ? String(member.hourly_cost) : "");
      return;
    }
    if (parsed !== member.hourly_cost) {
      onChange(parsed, member.hourly_cost_currency);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        step="0.01"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="Sin definir"
        className="w-20 rounded-lg border border-foreground/15 bg-foreground/10 px-2 py-1 text-[11px] text-foreground placeholder:text-foreground/40 outline-none focus:border-accent font-mono disabled:opacity-40"
      />
      <CurrencySelect
        value={member.hourly_cost_currency}
        onChange={(currency) => onChange(member.hourly_cost, currency)}
        className="rounded-lg border border-foreground/15 bg-foreground/10 px-1.5 py-1 text-[10px] text-foreground outline-none focus:border-accent cursor-pointer disabled:opacity-40"
      />
    </div>
  );
}

/**
 * Horas contractuales semanales editable en línea (ver migración 0033) —
 * mismo patrón "guarda al perder el foco" que `HourlyCostCell`. Nunca
 * queda vacío: a diferencia del costo por hora (que sí puede ser "sin
 * definir"), un valor inválido o vacío simplemente revierte al último
 * válido en vez de mandar `null` — la columna en base de datos es
 * `NOT NULL`, siempre hay un número real detrás.
 */
function WeeklyHoursCapacityCell({
  member,
  disabled,
  onChange,
}: {
  member: TeamMember;
  disabled: boolean;
  onChange: (hours: number) => void;
}) {
  const [draft, setDraft] = useState(String(member.weekly_hours_capacity));

  const commit = () => {
    const parsed = Number(draft);
    if (draft.trim() === "" || Number.isNaN(parsed) || parsed <= 0 || parsed > 168) {
      setDraft(String(member.weekly_hours_capacity));
      return;
    }
    if (parsed !== member.weekly_hours_capacity) {
      onChange(parsed);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="1"
        max="168"
        step="0.5"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className="w-16 rounded-lg border border-foreground/15 bg-foreground/10 px-2 py-1 text-[11px] text-foreground outline-none focus:border-accent font-mono disabled:opacity-40"
      />
      <span className="text-[10px] text-foreground/50">h</span>
    </div>
  );
}

function InviteModal({
  email,
  role,
  error,
  inviteUrl,
  isSubmitting,
  copied,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onCopyUrl,
  onClose,
}: {
  email: string;
  role: TeamRole;
  error: string | null;
  inviteUrl: string | null;
  isSubmitting: boolean;
  copied: boolean;
  onEmailChange: (v: string) => void;
  onRoleChange: (v: TeamRole) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCopyUrl: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const emailId = useId();
  const roleId = useId();

  return (
    <ModalShell titleId={titleId} title="Invitar al equipo" onClose={onClose}>
        {inviteUrl ? (
          <div className="space-y-4">
            <p className="text-xs text-foreground/70">
              Invitación creada. Compártele este enlace (válido por 3 días) — también se intentó enviar por correo.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-foreground/10 p-3">
              <span className="flex-1 truncate text-xs font-mono text-foreground/90">{inviteUrl}</span>
              <button
                onClick={onCopyUrl}
                className="flex items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-foreground/20 px-4 py-2.5 text-xs font-medium text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <div className="space-y-1.5">
              <label htmlFor={emailId} className="block text-xs font-semibold text-foreground/80">
                Correo electrónico
              </label>
              <input
                id={emailId}
                type="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="persona@skycode.agency"
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={roleId} className="block text-xs font-semibold text-foreground/80">
                Rol
              </label>
              <select
                id={roleId}
                value={role}
                onChange={(e) => onRoleChange(e.target.value as TeamRole)}
                className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
              >
                {(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => (
                  <option key={r} value={r} className="bg-background text-foreground">
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
              {isSubmitting ? "Enviando..." : "Enviar invitación"}
            </Button>
          </form>
        )}
    </ModalShell>
  );
}
