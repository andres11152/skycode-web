"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, UserRound } from "lucide-react";
import { Alert } from "./ui/Alert";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Field, SelectField, TextAreaField } from "./ui/Field";
import { UserAvatar } from "./UserAvatar";
import { roleLabel } from "./roleLabels";
import { PROFILE_LIMITS } from "@/lib/profileValidation";
import type { AvatarVariants, UserProfile } from "./types";

const LOCALE_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
] as const;

// Mismos límites que valida el servidor en lib/avatarStorage.ts — se
// chequean acá también solo para dar el error al instante, sin esperar a
// subir 8 MB para enterarse de que no se podía.
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface FormState {
  name: string;
  phone: string;
  bio: string;
  timezone: string;
  locale: string;
}

function toFormState(profile: UserProfile): FormState {
  return {
    name: profile.name,
    phone: profile.phone ?? "",
    bio: profile.bio ?? "",
    timezone: profile.timezone,
    locale: profile.locale,
  };
}

/**
 * Perfil propio — mismo componente en `/dashboard/cuenta` (equipo interno)
 * y `/portal/cuenta` (clientes): no depende de RBAC, solo de la sesión.
 *
 * `timezones` llega por prop desde el Server Component en vez de calcularse
 * acá con `Intl.supportedValuesOf()`: la lista del servidor y la del
 * navegador pueden diferir según versión, y renderizar opciones distintas
 * en SSR y en el cliente es un error de hidratación. Además el servidor
 * valida contra SU lista, así que es la única que importa.
 */
// El mismo componente sirve a quien trabaja EN la agencia y a quien le
// compra — "visible para tu equipo" es falso para un cliente, que no es
// parte del equipo sino quien lo contrata.
const AUDIENCE_COPY = {
  team: {
    description: "Cómo te ve el resto del equipo dentro del sistema.",
    bioHint: "Opcional. Visible para tu equipo dentro del sistema.",
  },
  client: {
    description: "Cómo te identifica el equipo de SkyCode en tus proyectos.",
    bioHint: "Opcional. Visible para el equipo que lleva tus proyectos.",
  },
} as const;

export function ProfileCard({
  initialProfile,
  timezones,
  audience,
}: {
  initialProfile: UserProfile;
  timezones: string[];
  audience: keyof typeof AUDIENCE_COPY;
}) {
  const copy = AUDIENCE_COPY[audience];
  const router = useRouter();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState<FormState>(() => toFormState(initialProfile));
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const saved = toFormState(profile);
  const isDirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== saved[k]);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Solo se mandan los campos que cambiaron: el diff de auditoría queda
    // limpio y un campo que nadie tocó nunca se reescribe por accidente.
    const changes: Record<string, string | null> = {};
    for (const key of Object.keys(form) as (keyof FormState)[]) {
      if (form[key] === saved[key]) continue;
      const value = form[key].trim();
      changes[key] = (key === "phone" || key === "bio") && value === "" ? null : value;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el perfil.");
        return;
      }
      setProfile(data.profile);
      setForm(toFormState(data.profile));
      setSuccess("Perfil actualizado.");
      // El nombre del header viene de la sesión del layout (Server Component).
      router.refresh();
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo tras un error
    if (!file) return;

    setError(null);
    setSuccess(null);
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError("Formato no soportado. Use una imagen JPEG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("La imagen supera el tamaño máximo permitido (8 MB).");
      return;
    }

    setAvatarBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/account/avatar", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo subir la imagen.");
        return;
      }
      setProfile((prev) => ({ ...prev, avatar: data.avatar as AvatarVariants }));
      setSuccess("Foto actualizada.");
      router.refresh();
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setError(null);
    setSuccess(null);
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo quitar la imagen.");
        return;
      }
      setProfile((prev) => ({ ...prev, avatar: null }));
      setSuccess("Foto eliminada.");
      router.refresh();
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={`${formId}-title`}
      className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5"
    >
      <div className="flex items-start gap-3 border-b border-foreground/10 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground/60">
          <UserRound size={18} />
        </div>
        <div>
          <h2 id={`${formId}-title`} className="text-sm font-bold text-foreground">
            Perfil
          </h2>
          <p className="mt-0.5 text-xs text-foreground/70">{copy.description}</p>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {/* Identidad + foto */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar name={profile.name} src={profile.avatar?.lg} size="lg" decorative />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-lg font-bold tracking-tight text-foreground">{profile.name}</p>
            <p className="truncate font-mono text-xs text-foreground/70">{profile.email}</p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Badge tone="info">{roleLabel(profile.role)}</Badge>
              <span suppressHydrationWarning className="text-[11px] text-foreground/70">
                Miembro desde {new Date(profile.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
              </span>
            </div>
          </div>
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
            {/* Un <button> real que dispara el input oculto (no un <label>
                estilizado): un label no recibe foco con Tab, un botón sí. */}
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={avatarBusy}>
              <Camera size={14} />
              {avatarBusy ? "Procesando…" : profile.avatar ? "Cambiar foto" : "Subir foto"}
            </Button>
            {profile.avatar && (
              <Button variant="ghost" onClick={handleRemoveAvatar} disabled={avatarBusy}>
                <Trash2 size={14} />
                Quitar
              </Button>
            )}
          </div>
        </div>
        <p className="-mt-3 text-[11px] text-foreground/70">
          JPEG, PNG o WebP, hasta 8 MB. Se recorta al centro en formato cuadrado.
        </p>

        <div aria-live="polite" className="empty:hidden">
          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
        </div>

        {/* Datos editables */}
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${formId}-name`}
              label="Nombre completo"
              value={form.name}
              onChange={update("name")}
              maxLength={PROFILE_LIMITS.name}
              autoComplete="name"
              required
            />
            <Field
              id={`${formId}-phone`}
              label="Teléfono"
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              maxLength={PROFILE_LIMITS.phone}
              autoComplete="tel"
              placeholder="+57 300 000 0000"
              hint="Opcional. Incluye el indicativo del país."
            />
            <SelectField
              id={`${formId}-timezone`}
              label="Zona horaria"
              value={form.timezone}
              onChange={update("timezone")}
              hint="Se usa para mostrarte fechas y horas en tu hora local."
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </SelectField>
            <SelectField
              id={`${formId}-locale`}
              label="Idioma de comunicaciones"
              value={form.locale}
              onChange={update("locale")}
              hint="Idioma de los correos automáticos que recibes."
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectField>
          </div>

          <TextAreaField
            id={`${formId}-bio`}
            label="Sobre ti"
            value={form.bio}
            onChange={update("bio")}
            maxLength={PROFILE_LIMITS.bio}
            hint={copy.bioHint}
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 border-t border-foreground/10 pt-4">
            {isDirty && (
              <Button type="button" variant="ghost" onClick={() => setForm(saved)} disabled={saving}>
                Descartar
              </Button>
            )}
            <Button type="submit" variant="accent" disabled={!isDirty || saving || form.name.trim().length < 2}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
