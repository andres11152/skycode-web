"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle,  Camera, ExternalLink, Trash2 } from "lucide-react";
import { Alert } from "./ui/Alert";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Field, SelectField, TextAreaField } from "./ui/Field";
import { initials } from "./UserAvatar";
import { TEAM_PROFILE_LIMITS } from "@/lib/profileValidation";
import type { AdminTeamProfile, AdminTeamProfileTranslation } from "@/lib/queries/teamProfiles";
import type { Locale } from "@/lib/i18n";
import { useFeedback } from "./ui/Feedback";
import { PageBack } from "./ui/PageHeader";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // mismo límite que el pipeline del portafolio

type TranslationDraft = Omit<AdminTeamProfileTranslation, "locale">;

function emptyDraft(): TranslationDraft {
  return { name: "", publicRole: "", publicBio: "" };
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export function TeamProfileEditor({
  profile: initialProfile,
  teamAccounts,
  authoredArticles,
  canWrite,
}: {
  profile: AdminTeamProfile;
  teamAccounts: { id: number; name: string; email: string }[];
  authoredArticles: number;
  canWrite: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState(initialProfile);
  const [locale, setLocale] = useState<Locale>("es");
  const [drafts, setDrafts] = useState<Record<Locale, TranslationDraft>>(() => ({
    es: initialProfile.translations.es ?? emptyDraft(),
    en: initialProfile.translations.en ?? emptyDraft(),
    fr: initialProfile.translations.fr ?? emptyDraft(),
  }));
  const [settings, setSettings] = useState({
    slug: initialProfile.slug,
    linkedinUrl: initialProfile.linkedinUrl ?? "",
    githubUrl: initialProfile.githubUrl ?? "",
    userId: initialProfile.userId ? String(initialProfile.userId) : "",
  });
  const [busy, setBusy] = useState<null | "translation" | "settings" | "photo" | "publish" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const saved = profile.translations[locale] ?? emptyDraft();
  const draft = drafts[locale];
  const translationDirty =
    draft.name !== saved.name || draft.publicRole !== saved.publicRole || draft.publicBio !== saved.publicBio;
  const slugChanged = settings.slug.trim() !== profile.slug;
  const settingsDirty =
    slugChanged ||
    settings.linkedinUrl !== (profile.linkedinUrl ?? "") ||
    settings.githubUrl !== (profile.githubUrl ?? "") ||
    settings.userId !== (profile.userId ? String(profile.userId) : "");
  const displayName = profile.translations.es?.name || profile.slug;
  const readOnly = !canWrite;

  const report = (message: string) => {
    setError(null);
    setSuccess(message);
  };

  const updateDraft = (field: keyof TranslationDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: e.target.value } }));
    setSuccess(null);
  };

  const handleSaveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("translation");
    setError(null);
    try {
      const body = { name: draft.name.trim(), publicRole: draft.publicRole.trim(), publicBio: draft.publicBio.trim() };
      const res = await fetch(`/api/team-profiles/${profile.id}/translations/${locale}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res, "No se pudo guardar."));
      setProfile((prev) => ({ ...prev, translations: { ...prev.translations, [locale]: { locale, ...body } } }));
      setDrafts((prev) => ({ ...prev, [locale]: body }));
      report(`Contenido en ${LOCALES.find((l) => l.code === locale)?.label} guardado.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  };

  const feedback = useFeedback();
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      slugChanged &&
      profile.isPublished &&
      authoredArticles > 0 &&
      !(await feedback.confirm({ title: `${authoredArticles} artículo${authoredArticles === 1 ? "" : "s"} del blog enlaza${authoredArticles === 1 ? "" : "n"} a /equipo#${profile.slug} como autor. Cambiar el identificador rompe esos enlaces. ¿Continuar?`, tone: "danger" }))
    ) {
      return;
    }

    const body: Record<string, unknown> = {};
    if (slugChanged) body.slug = settings.slug.trim();
    if (settings.linkedinUrl !== (profile.linkedinUrl ?? "")) body.linkedinUrl = settings.linkedinUrl.trim() || null;
    if (settings.githubUrl !== (profile.githubUrl ?? "")) body.githubUrl = settings.githubUrl.trim() || null;
    if (settings.userId !== (profile.userId ? String(profile.userId) : "")) body.userId = settings.userId ? Number(settings.userId) : null;

    setBusy("settings");
    setError(null);
    try {
      const res = await fetch(`/api/team-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res, "No se pudo guardar."));
      const account = teamAccounts.find((a) => String(a.id) === settings.userId);
      setProfile((prev) => ({
        ...prev,
        slug: settings.slug.trim(),
        linkedinUrl: settings.linkedinUrl.trim() || null,
        githubUrl: settings.githubUrl.trim() || null,
        userId: settings.userId ? Number(settings.userId) : null,
        linkedUserName: account?.name ?? null,
      }));
      report("Configuración guardada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  };

  const handleTogglePublished = async () => {
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/team-profiles/${profile.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !profile.isPublished }),
      });
      if (!res.ok) throw new Error(await readError(res, "No se pudo cambiar la publicación."));
      setProfile((prev) => ({ ...prev, isPublished: !prev.isPublished }));
      report(profile.isPublished ? "Perfil despublicado: ya no aparece en /equipo." : "Perfil publicado en /equipo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la publicación.");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!(await feedback.confirm({ title: `¿Eliminar el perfil de ${displayName}? Desaparece de /equipo de inmediato.`, tone: "danger" }))) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/team-profiles/${profile.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "No se pudo eliminar."));
      router.push("/dashboard/perfiles-publicos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      setBusy(null);
    }
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no soportado. Use una imagen JPEG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("La imagen supera el tamaño máximo permitido (15 MB).");
      return;
    }
    setBusy("photo");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/team-profiles/${profile.id}/photo`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen.");
      setProfile((prev) => ({ ...prev, avatar: data.photo }));
      report("Foto actualizada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemovePhoto = async () => {
    setBusy("photo");
    try {
      const res = await fetch(`/api/team-profiles/${profile.id}/photo`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "No se pudo quitar la imagen."));
      setProfile((prev) => ({ ...prev, avatar: null }));
      report("Foto eliminada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la imagen.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageBack href="/dashboard/perfiles-publicos" label="Volver a perfiles públicos" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={profile.isPublished ? "success" : "neutral"}>{profile.isPublished ? "Publicado" : "Borrador"}</Badge>
            <span className="font-mono text-[11px] text-foreground/70">/equipo#{profile.slug}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile.isPublished && (
            <a
              href={`/equipo#${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ExternalLink size={14} />
              Ver en la web
            </a>
          )}
          {canWrite && (
            <>
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={busy !== null} className="text-danger hover:bg-danger/10 hover:text-danger">
                <Trash2 size={14} />
                Eliminar
              </Button>
              <Button type="button" variant={profile.isPublished ? "secondary" : "accent"} onClick={handleTogglePublished} disabled={busy !== null}>
                {busy === "publish" ? "Guardando…" : profile.isPublished ? "Despublicar" : "Publicar"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* Foto — misma proporción 3:4 que la tarjeta pública */}
        <section aria-labelledby={`${id}-photo`} className="space-y-3 rounded-xl border border-foreground/10 bg-background p-5 shadow-sm shadow-black/5">
          <h2 id={`${id}-photo`} className="text-sm font-bold text-foreground">
            Foto
          </h2>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl bg-foreground/[0.04] ring-1 ring-foreground/10">
            {profile.avatar ? (
              <Image src={profile.avatar.md} alt={`Foto de ${displayName}`} fill sizes="220px" className="object-cover object-top" />
            ) : (
              <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-5xl font-bold tracking-tighter text-foreground/20">
                {initials(displayName)}
              </span>
            )}
          </div>
          {canWrite && (
            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(",")} onChange={handlePhotoSelected} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
                <Camera size={14} />
                {busy === "photo" ? "Procesando…" : profile.avatar ? "Cambiar foto" : "Subir foto"}
              </Button>
              {profile.avatar && (
                <Button type="button" variant="ghost" onClick={handleRemovePhoto} disabled={busy !== null}>
                  Quitar foto
                </Button>
              )}
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-foreground/70">
            Retrato vertical, idealmente 3:4. JPEG, PNG o WebP hasta 15 MB. La web encuadra desde arriba.
          </p>
        </section>

        <div className="space-y-6">
          {/* Contenido por idioma */}
          <form
            onSubmit={handleSaveTranslation}
            noValidate
            aria-labelledby={`${id}-content`}
            className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5"
          >
            <div className="flex flex-col gap-3 border-b border-foreground/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id={`${id}-content`} className="text-sm font-bold text-foreground">
                  Contenido
                </h2>
                <p className="mt-0.5 text-xs text-foreground/70">Si falta un idioma, la web muestra el español.</p>
              </div>
              <div role="group" aria-label="Idioma del contenido" className="flex gap-1 rounded-full bg-foreground/[0.04] p-1">
                {LOCALES.map((l) => {
                  const selected = l.code === locale;
                  const missing = !profile.translations[l.code];
                  return (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setLocale(l.code);
                        setSuccess(null);
                      }}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        selected ? "bg-background text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"
                      }`}
                    >
                      {l.code.toUpperCase()}
                      {missing && (
                        <>
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
                          <span className="sr-only">(sin traducir)</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <fieldset disabled={readOnly || busy !== null} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`${id}-name-${locale}`}
                  label="Nombre"
                  value={draft.name}
                  onChange={updateDraft("name")}
                  maxLength={TEAM_PROFILE_LIMITS.name}
                  required
                />
                <Field
                  id={`${id}-role-${locale}`}
                  label="Cargo público"
                  value={draft.publicRole}
                  onChange={updateDraft("publicRole")}
                  maxLength={TEAM_PROFILE_LIMITS.publicRole}
                  placeholder="Ej. Backend & Arquitectura"
                  hint="Aparece como etiqueta sobre la foto."
                />
              </div>
              <TextAreaField
                id={`${id}-bio-${locale}`}
                label="Descripción"
                value={draft.publicBio}
                onChange={updateDraft("publicBio")}
                maxLength={TEAM_PROFILE_LIMITS.publicBio}
                rows={4}
                hint="En primera persona, concreta: qué hace y qué le cuida al cliente."
              />
            </fieldset>

            {canWrite && (
              <div className="flex justify-end border-t border-foreground/10 p-5">
                <Button type="submit" variant="secondary" disabled={!translationDirty || busy !== null || draft.name.trim().length < 2}>
                  {busy === "translation" ? "Guardando…" : `Guardar ${LOCALES.find((l) => l.code === locale)?.label}`}
                </Button>
              </div>
            )}
          </form>

          {/* Configuración */}
          <form
            onSubmit={handleSaveSettings}
            noValidate
            aria-labelledby={`${id}-settings`}
            className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5"
          >
            <div className="border-b border-foreground/10 p-5">
              <h2 id={`${id}-settings`} className="text-sm font-bold text-foreground">
                Configuración
              </h2>
              <p className="mt-0.5 text-xs text-foreground/70">Identificador, enlaces y cuenta del equipo asociada.</p>
            </div>
            <fieldset disabled={readOnly || busy !== null} className="space-y-4 p-5">
              <Field
                id={`${id}-slug`}
                label="Identificador en la URL"
                value={settings.slug}
                onChange={(e) => setSettings((s) => ({ ...s, slug: e.target.value }))}
                hint={`/equipo#${settings.slug || "…"}`}
              />
              {slugChanged && authoredArticles > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-warning">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    {authoredArticles} artículo{authoredArticles === 1 ? "" : "s"} del blog enlaza{authoredArticles === 1 ? "" : "n"} a{" "}
                    <span className="font-mono">/equipo#{profile.slug}</span> como autor. Si cambias el identificador, esos enlaces dejan de
                    llevar a esta ficha.
                  </span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`${id}-linkedin`}
                  label="LinkedIn"
                  type="url"
                  value={settings.linkedinUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, linkedinUrl: e.target.value }))}
                  placeholder="https://www.linkedin.com/in/…"
                />
                <Field
                  id={`${id}-github`}
                  label="GitHub"
                  type="url"
                  value={settings.githubUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, githubUrl: e.target.value }))}
                  placeholder="https://github.com/…"
                />
              </div>
              <SelectField
                id={`${id}-user`}
                label="Cuenta del equipo"
                value={settings.userId}
                onChange={(e) => setSettings((s) => ({ ...s, userId: e.target.value }))}
                hint="Opcional. Vincula esta ficha con la cuenta de la persona en el panel."
              >
                <option value="">Sin cuenta vinculada</option>
                {teamAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.email}
                  </option>
                ))}
              </SelectField>
            </fieldset>
            {canWrite && (
              <div className="flex justify-end border-t border-foreground/10 p-5">
                <Button type="submit" variant="secondary" disabled={!settingsDirty || busy !== null}>
                  {busy === "settings" ? "Guardando…" : "Guardar configuración"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
