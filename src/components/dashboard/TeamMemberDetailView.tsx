"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Camera,
  Clock,
  History,
  LogOut,
  Mail,
  Monitor,
  Phone,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Alert } from "./ui/Alert";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Field, SelectField } from "./ui/Field";
import { UserAvatar } from "./UserAvatar";
import { roleLabel } from "./roleLabels";
import { PROFILE_LIMITS } from "@/lib/profileValidation";
import { CURRENCIES, type Currency } from "@/lib/currency";
import type { AuditLogEntry, AvatarVariants, TeamMemberDetail, UserSessionRow } from "./types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useFeedback } from "./ui/Feedback";
import { PageBack } from "./ui/PageHeader";

const ASSIGNABLE_ROLES = ["admin", "sales_manager", "traffiker"] as const;

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Nombre legible de las acciones de auditoría más comunes que involucran a
 * una persona. Las que no estén acá se muestran con su clave cruda — el
 * catálogo real de acciones es abierto (cada `logAudit()` define la suya,
 * ver lib/queries/audit.ts), así que un mapa cerrado se desactualizaría.
 */
const ACTION_LABELS: Record<string, string> = {
  "user.login": "Inició sesión",
  "user.login_failed": "Intento de inicio de sesión fallido",
  "user.logout": "Cerró sesión",
  "user.profile_update": "Actualizó su perfil",
  "user.avatar_upload": "Cambió la foto de perfil",
  "user.avatar_remove": "Quitó la foto de perfil",
  "user.password_change": "Cambió su contraseña",
  "user.password_change_failed": "Intento fallido de cambiar la contraseña",
  "user.reset_password": "Restableció su contraseña por correo",
  "user.request_password_reset": "Pidió restablecer su contraseña",
  "user.2fa_enabled": "Activó la autenticación en dos pasos",
  "user.2fa_disabled": "Desactivó la autenticación en dos pasos",
  "user.2fa_failed": "Código de 2FA incorrecto",
  "team.update": "Cuenta modificada por un admin",
  "team.accept_invite": "Aceptó la invitación al equipo",
  "team.revoke_sessions": "Un admin cerró todas sus sesiones",
  "session.revoke": "Cerró una sesión",
};

const VERB_LABELS: Record<string, string> = { create: "Creó", update: "Actualizó", delete: "Eliminó" };
const ENTITY_LABELS: Record<string, string> = {
  lead: "un lead",
  project: "un proyecto",
  proposal: "una propuesta",
  invoice: "una factura",
  payment: "un pago",
  client: "un cliente",
  task: "una tarea",
  campaign: "una campaña",
  expense: "un gasto",
  document: "un documento",
  article: "un artículo",
  retainer: "un retainer",
};

/**
 * Respaldo para acciones que no están en `ACTION_LABELS`: la convención
 * `entidad.verbo` del repo ("lead.update") se traduce a "Actualizó un
 * lead". Si alguna parte no se reconoce, se muestra la clave cruda en vez
 * de inventar una frase.
 */
function describeAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const [entity, verb] = action.split(".");
  if (entity && verb && VERB_LABELS[verb] && ENTITY_LABELS[entity]) {
    return `${VERB_LABELS[verb]} ${ENTITY_LABELS[entity]}`;
  }
  return action;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  hireDate: string;
  role: string;
  weeklyHoursCapacity: string;
  hourlyCost: string;
  hourlyCostCurrency: Currency;
}

function toFormState(member: TeamMemberDetail): FormState {
  return {
    name: member.name,
    email: member.email,
    phone: member.phone ?? "",
    jobTitle: member.jobTitle ?? "",
    hireDate: member.hireDate ?? "",
    role: member.role,
    weeklyHoursCapacity: String(member.weeklyHoursCapacity),
    hourlyCost: member.hourlyCost !== null ? String(member.hourlyCost) : "",
    hourlyCostCurrency: member.hourlyCostCurrency,
  };
}

/** "Chrome en macOS" a partir del user-agent — misma heurística corta que `SessionsView`. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo desconocido";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : null;
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} en ${os}`;
  return browser ?? os ?? "Dispositivo desconocido";
}

export function TeamMemberDetailView({
  member: initialMember,
  sessions: initialSessions,
  activity,
  isSelf,
  canWrite,
}: {
  member: TeamMemberDetail;
  sessions: UserSessionRow[];
  activity: AuditLogEntry[];
  isSelf: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [member, setMember] = useState(initialMember);
  const [sessions, setSessions] = useState(initialSessions);
  const [form, setForm] = useState<FormState>(() => toFormState(initialMember));
  const [busy, setBusy] = useState<null | "save" | "avatar" | "status" | "sessions">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const saved = toFormState(member);
  const dirtyKeys = (Object.keys(form) as (keyof FormState)[]).filter((k) => form[k] !== saved[k]);
  const isDirty = dirtyKeys.length > 0;
  const emailChanged = form.email.trim().toLowerCase() !== member.email;
  const isActive = member.status === "active";
  const readOnly = !canWrite;

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(null);
  };

  const notify = (message: string) => {
    setError(null);
    setSuccess(message);
  };

  const patchMember = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudieron guardar los cambios.");
  };

  const feedback = useFeedback();
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    if (
      emailChanged &&
      !(await feedback.confirm({ title: `Cambiar el correo cierra todas las sesiones de ${member.name}: tendrá que volver a entrar con ${form.email.trim()}. ¿Continuar?`, tone: "danger" }))
    ) {
      return;
    }

    // Solo los campos que cambiaron — así el diff de auditoría queda limpio.
    const body: Record<string, unknown> = {};
    for (const key of dirtyKeys) {
      const value = form[key].trim();
      if (key === "weeklyHoursCapacity") body[key] = Number(value);
      else if (key === "hourlyCost") body[key] = value === "" ? null : Number(value);
      else if (key === "phone" || key === "jobTitle" || key === "hireDate") body[key] = value === "" ? null : value;
      else body[key] = value;
    }

    setBusy("save");
    setError(null);
    setSuccess(null);
    try {
      await patchMember(body);
      const next: TeamMemberDetail = {
        ...member,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        jobTitle: form.jobTitle.trim() || null,
        hireDate: form.hireDate || null,
        role: form.role,
        weeklyHoursCapacity: Number(form.weeklyHoursCapacity),
        hourlyCost: form.hourlyCost.trim() === "" ? null : Number(form.hourlyCost),
        hourlyCostCurrency: form.hourlyCostCurrency,
      };
      setMember(next);
      setForm(toFormState(next));
      if (emailChanged) setSessions([]);
      notify(emailChanged ? "Datos guardados. Se cerraron sus sesiones por el cambio de correo." : "Datos guardados.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setBusy(null);
    }
  };

  const handleToggleStatus = async () => {
    const next = isActive ? "disabled" : "active";
    if (
      next === "disabled" &&
      !(await feedback.confirm({ title: `¿Desactivar la cuenta de ${member.name}? Se cerrarán todas sus sesiones y no podrá entrar hasta que la reactives.`, tone: "danger" }))
    ) {
      return;
    }
    setBusy("status");
    try {
      await patchMember({ status: next });
      setMember((prev) => ({ ...prev, status: next }));
      if (next === "disabled") setSessions([]);
      notify(next === "disabled" ? "Cuenta desactivada." : "Cuenta reactivada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setBusy(null);
    }
  };

  const handleRevokeSessions = async () => {
    if (!(await feedback.confirm({ title: `¿Cerrar las ${sessions.length} sesiones activas de ${member.name}? Podrá volver a entrar con su contraseña.`, tone: "danger" }))) {
      return;
    }
    setBusy("sessions");
    try {
      const res = await fetch(`/api/team/${member.id}/sessions`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudieron cerrar las sesiones.");
      setSessions([]);
      notify("Sesiones cerradas.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cerrar las sesiones.");
    } finally {
      setBusy(null);
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError("Formato no soportado. Use una imagen JPEG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("La imagen supera el tamaño máximo permitido (8 MB).");
      return;
    }
    setBusy("avatar");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/team/${member.id}/avatar`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen.");
      setMember((prev) => ({ ...prev, avatar: data.avatar as AvatarVariants }));
      notify("Foto actualizada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveAvatar = async () => {
    setBusy("avatar");
    try {
      const res = await fetch(`/api/team/${member.id}/avatar`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo quitar la imagen.");
      }
      setMember((prev) => ({ ...prev, avatar: null }));
      notify("Foto eliminada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la imagen.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageBack href="/dashboard/equipo" label="Volver al equipo" />

      {/* Encabezado: identidad */}
      <div className="rounded-xl border border-foreground/10 bg-background p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar name={member.name} src={member.avatar?.lg} size="lg" decorative />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{member.name}</h1>
              {isSelf && <Badge tone="neutral">Tú</Badge>}
            </div>
            {member.jobTitle && <p className="text-sm text-foreground/80">{member.jobTitle}</p>}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground/70">
              <span className="flex items-center gap-1.5 font-mono">
                <Mail size={13} className="text-foreground/70" aria-hidden="true" />
                {member.email}
              </span>
              {member.phone && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone size={13} className="text-foreground/70" aria-hidden="true" />
                  {member.phone}
                </span>
              )}
              <span suppressHydrationWarning className="flex items-center gap-1.5">
                <Clock size={13} className="text-foreground/70" aria-hidden="true" />
                {member.hireDate
                  ? `Ingresó el ${formatDate(member.hireDate)}`
                  : `Cuenta creada el ${formatDate(member.createdAt)}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone="info">{roleLabel(member.role)}</Badge>
              <Badge tone={isActive ? "success" : "danger"}>{isActive ? "Activa" : "Desactivada"}</Badge>
              <Badge tone={member.totpEnabled ? "success" : "warning"}>{member.totpEnabled ? "2FA activo" : "Sin 2FA"}</Badge>
            </div>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                onChange={handleAvatarSelected}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
                <Camera size={14} />
                {busy === "avatar" ? "Procesando…" : member.avatar ? "Cambiar foto" : "Subir foto"}
              </Button>
              {member.avatar && (
                <Button type="button" variant="ghost" onClick={handleRemoveAvatar} disabled={busy !== null}>
                  <Trash2 size={14} />
                  Quitar foto
                </Button>
              )}
            </div>
          )}
        </div>
        {member.bio && (
          <p className="mt-5 border-t border-foreground/10 pt-4 text-sm leading-relaxed text-foreground/80">{member.bio}</p>
        )}
      </div>

      <div aria-live="polite" className="empty:hidden">
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Datos editables */}
        <form
          onSubmit={handleSave}
          noValidate
          aria-labelledby={`${formId}-title`}
          className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5"
        >
          <div className="border-b border-foreground/10 p-5">
            <h2 id={`${formId}-title`} className="text-sm font-bold text-foreground">
              Datos de la persona
            </h2>
            <p className="mt-0.5 text-xs text-foreground/70">
              {readOnly ? "Solo lectura." : "Lo que fija la organización. Teléfono y bio también los puede editar la propia persona."}
            </p>
          </div>

          <fieldset disabled={readOnly || busy !== null} className="space-y-6 p-5">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Contacto</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${formId}-name`} label="Nombre completo" value={form.name} onChange={update("name")} maxLength={PROFILE_LIMITS.name} required />
                <Field
                  id={`${formId}-email`}
                  label="Correo (inicio de sesión)"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  hint={emailChanged ? "Al guardar se cerrarán todas sus sesiones." : undefined}
                  required
                />
                <Field
                  id={`${formId}-phone`}
                  label="Teléfono"
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  maxLength={PROFILE_LIMITS.phone}
                  placeholder="+57 300 000 0000"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-foreground/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Organización</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`${formId}-job`}
                  label="Cargo"
                  value={form.jobTitle}
                  onChange={update("jobTitle")}
                  maxLength={PROFILE_LIMITS.jobTitle}
                  placeholder="Ej. Desarrollador Backend Senior"
                />
                <Field
                  id={`${formId}-hire`}
                  label="Fecha de ingreso"
                  type="date"
                  value={form.hireDate}
                  onChange={update("hireDate")}
                  max={new Date().toISOString().slice(0, 10)}
                />
                <SelectField
                  id={`${formId}-role`}
                  label="Rol de acceso"
                  value={form.role}
                  onChange={update("role")}
                  disabled={isSelf || readOnly || busy !== null}
                  hint={isSelf ? "No puedes cambiar tu propio rol." : "Define qué módulos del panel puede usar."}
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </SelectField>
                <Field
                  id={`${formId}-hours`}
                  label="Horas por semana"
                  type="number"
                  min={1}
                  max={168}
                  step="0.5"
                  value={form.weeklyHoursCapacity}
                  onChange={update("weeklyHoursCapacity")}
                  hint="Capacidad contractual, usada en el reporte de Capacidad."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                <Field
                  id={`${formId}-cost`}
                  label="Costo por hora"
                  type="number"
                  min={0}
                  step="any"
                  value={form.hourlyCost}
                  onChange={update("hourlyCost")}
                  placeholder="Sin definir"
                  hint="Solo lo ve admin. Valoriza sus horas en Rentabilidad."
                />
                <SelectField
                  id={`${formId}-currency`}
                  label="Moneda"
                  value={form.hourlyCostCurrency}
                  onChange={update("hourlyCostCurrency")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </fieldset>

          {canWrite && (
            <div className="flex items-center justify-end gap-3 border-t border-foreground/10 p-5">
              {isDirty && (
                <Button type="button" variant="ghost" onClick={() => setForm(saved)} disabled={busy !== null}>
                  Descartar
                </Button>
              )}
              <Button type="submit" variant="accent" disabled={!isDirty || busy !== null || form.name.trim().length < 2}>
                {busy === "save" ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          )}
        </form>

        {/* Columna lateral: acceso */}
        <div className="space-y-6">
          <section aria-labelledby={`${formId}-access`} className="rounded-xl border border-foreground/10 bg-background p-5 shadow-sm shadow-black/5 space-y-4">
            <h2 id={`${formId}-access`} className="text-sm font-bold text-foreground">
              Acceso
            </h2>
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${member.totpEnabled ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
              >
                {member.totpEnabled ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </div>
              <p className="text-xs leading-relaxed text-foreground/80">
                {member.totpEnabled
                  ? "Tiene la autenticación en dos pasos activa."
                  : "No tiene la autenticación en dos pasos activa. Solo la propia persona puede activarla desde Mi Cuenta."}
              </p>
            </div>

            {canWrite && !isSelf && (
              <div className="space-y-2 border-t border-foreground/10 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRevokeSessions}
                  disabled={busy !== null || sessions.length === 0}
                  className="w-full"
                >
                  <LogOut size={14} />
                  {busy === "sessions" ? "Cerrando…" : "Cerrar todas sus sesiones"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleToggleStatus}
                  disabled={busy !== null}
                  className={`w-full ${isActive ? "text-danger hover:bg-danger/10 hover:text-danger" : ""}`}
                >
                  {isActive ? <Ban size={14} /> : <PlayCircle size={14} />}
                  {busy === "status" ? "Guardando…" : isActive ? "Desactivar cuenta" : "Reactivar cuenta"}
                </Button>
              </div>
            )}
          </section>

          <section aria-labelledby={`${formId}-sessions`} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <div className="border-b border-foreground/10 p-5">
              <h2 id={`${formId}-sessions`} className="text-sm font-bold text-foreground">
                Sesiones activas
              </h2>
              <p className="mt-0.5 text-xs text-foreground/70">
                {sessions.length === 0 ? "Ninguna en este momento." : `${sessions.length} dispositivo${sessions.length === 1 ? "" : "s"} con la cuenta abierta.`}
              </p>
            </div>
            {sessions.length > 0 && (
              <ul className="divide-y divide-foreground/10">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 px-5 py-3">
                    <Monitor size={14} className="mt-0.5 shrink-0 text-foreground/70" aria-hidden="true" />
                    <div className="min-w-0 text-xs">
                      <p className="font-medium text-foreground">{describeDevice(s.user_agent)}</p>
                      <p suppressHydrationWarning className="font-mono text-foreground/70">
                        {s.ip || "IP desconocida"} · desde {formatDateTime(s.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Actividad */}
      <section aria-labelledby={`${formId}-activity`} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        <div className="flex items-center justify-between gap-3 border-b border-foreground/10 p-5">
          <div>
            <h2 id={`${formId}-activity`} className="flex items-center gap-2 text-sm font-bold text-foreground">
              <History size={15} className="text-foreground/70" aria-hidden="true" />
              Actividad reciente
            </h2>
            <p className="mt-0.5 text-xs text-foreground/70">Lo que hizo y lo que se le hizo a esta cuenta.</p>
          </div>
          <Link
            href="/dashboard/auditoria"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-accent-strong hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver auditoría completa
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="p-5 text-xs text-foreground/70">Sin actividad registrada todavía.</p>
        ) : (
          <ol className="divide-y divide-foreground/10">
            {activity.map((entry) => {
              const byOther = entry.actor_id !== null && entry.actor_id !== member.id;
              return (
                <li key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-foreground">{describeAction(entry.action)}</p>
                    {byOther && entry.actor_email && (
                      <p className="font-mono text-foreground/70">por {entry.actor_email}</p>
                    )}
                    {entry.entity_type !== "user" && (
                      <p className="font-mono text-foreground/70">
                        {entry.entity_type}
                        {entry.entity_id ? ` #${entry.entity_id}` : ""}
                      </p>
                    )}
                  </div>
                  <time suppressHydrationWarning dateTime={entry.created_at} className="shrink-0 font-mono text-[11px] text-foreground/70">
                    {formatDateTime(entry.created_at)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
