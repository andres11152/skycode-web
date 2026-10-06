"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, IdCard, Link2, Plus } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { Alert } from "./ui/Alert";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { initials } from "./UserAvatar";
import { TEAM_PROFILE_LIMITS } from "@/lib/profileValidation";
import type { AdminTeamProfile } from "@/lib/queries/teamProfiles";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Miniatura en la misma proporción 3:4 que la tarjeta pública, para que lo que se ve acá sea lo que se verá en la web. */
function ProfileThumb({ profile, name }: { profile: AdminTeamProfile; name: string }) {
  return (
    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-foreground/[0.06] ring-1 ring-foreground/10">
      {profile.avatar ? (
        <Image src={profile.avatar.sm} alt="" fill sizes="48px" className="object-cover object-top" />
      ) : (
        <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-xs font-bold text-foreground/70">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

export function TeamProfilesBoard({ initialProfiles, canWrite }: { initialProfiles: AdminTeamProfile[]; canWrite: boolean }) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= profiles.length) return;
    const a = profiles[index];
    const b = profiles[target];
    setBusyId(a.id);
    setError(null);
    try {
      // Intercambia los `sort_order` de los dos vecinos — mismo criterio
      // que el listado del portafolio (botones accesibles por teclado en
      // vez de arrastrar y soltar).
      const responses = await Promise.all([
        fetch(`/api/team-profiles/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: b.sortOrder }),
        }),
        fetch(`/api/team-profiles/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: a.sortOrder }),
        }),
      ]);
      if (responses.some((r) => !r.ok)) {
        setError("No se pudo reordenar.");
        return;
      }
      const next = [...profiles];
      next[index] = { ...b, sortOrder: a.sortOrder };
      next[target] = { ...a, sortOrder: b.sortOrder };
      setProfiles(next);
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublished = async (profile: AdminTeamProfile) => {
    setBusyId(profile.id);
    setError(null);
    try {
      const res = await fetch(`/api/team-profiles/${profile.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !profile.isPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo cambiar la publicación.");
        return;
      }
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, isPublished: !p.isPublished } : p)));
    } finally {
      setBusyId(null);
    }
  };

  const publishedCount = profiles.filter((p) => p.isPublished).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Perfiles públicos</h1>
          <p className="mt-1 text-xs text-foreground/70">
            Las fichas de la página <span className="font-mono">/equipo</span> del sitio. {publishedCount} publicado
            {publishedCount === 1 ? "" : "s"} de {profiles.length}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/equipo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ExternalLink size={14} />
            Ver en la web
          </a>
          {canWrite && (
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Nuevo perfil
            </Button>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {profiles.length === 0 ? (
          <EmptyState
            icon={IdCard}
            title="Sin perfiles todavía"
            description="Crea la primera ficha para la página de equipo del sitio."
            action={canWrite ? { label: "Nuevo perfil", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <ul className="divide-y divide-foreground/10">
            {profiles.map((profile, index) => {
              const es = profile.translations.es;
              const name = es?.name || profile.slug;
              const busy = busyId === profile.id;
              return (
                <li key={profile.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
                  <Link
                    href={`/dashboard/perfiles-publicos/${profile.id}`}
                    className="group flex min-w-0 flex-1 items-center gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <ProfileThumb profile={profile} name={name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground group-hover:text-accent-strong group-hover:underline">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-foreground/70">{es?.publicRole || "Sin cargo público"}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground/70">
                        <span className="font-mono">/equipo#{profile.slug}</span>
                        {profile.linkedUserName && (
                          <span className="flex items-center gap-1">
                            <Link2 size={11} aria-hidden="true" />
                            Cuenta de {profile.linkedUserName}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge tone={profile.isPublished ? "success" : "neutral"}>{profile.isPublished ? "Publicado" : "Borrador"}</Badge>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTogglePublished(profile)}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          {profile.isPublished ? "Despublicar" : "Publicar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, -1)}
                          disabled={busy || index === 0}
                          aria-label={`Subir a ${name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 1)}
                          disabled={busy || index === profiles.length - 1}
                          aria-label={`Bajar a ${name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {createOpen && (
        <CreateProfileModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            router.push(`/dashboard/perfiles-publicos/${id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo crear el perfil.");
        return;
      }
      // El nombre en español se guarda de una vez: sin él, el perfil
      // aparecería en el listado identificado solo por su slug.
      await fetch(`/api/team-profiles/${data.id}/translations/es`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), publicRole: "", publicBio: "" }),
      });
      onCreated(data.id);
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Nuevo perfil público" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          id={`${titleId}-name`}
          label="Nombre"
          autoFocus
          value={name}
          maxLength={TEAM_PROFILE_LIMITS.name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          placeholder="Ej. Ana Gómez"
          required
        />
        <Field
          id={`${titleId}-slug`}
          label="Identificador en la URL"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          hint={`Quedará en /equipo#${slug || "ana-gomez"}. Evita cambiarlo una vez publicado: el blog enlaza a los autores por este identificador.`}
          required
        />
        <Button type="submit" variant="accent" className="w-full" disabled={submitting || name.trim().length < 2 || slug.trim().length < 2}>
          {submitting ? "Creando…" : "Crear y editar"}
        </Button>
      </form>
    </ModalShell>
  );
}
