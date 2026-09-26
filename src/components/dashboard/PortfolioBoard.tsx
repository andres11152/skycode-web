"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Star, ArrowUp, ArrowDown, Trash2, Wrench } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { PORTFOLIO_ICON_NAMES } from "@/content/portfolioShared";
import type { AdminPortfolioListItem } from "@/lib/queries/portfolio";
import type { PortfolioStatus } from "@/content/portfolioShared";

const STATUS_LABELS: Record<PortfolioStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

const STATUS_TONES: Record<PortfolioStatus, BadgeTone> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

export function PortfolioBoard({
  initialProjects,
  canWrite,
}: {
  initialProjects: AdminPortfolioListItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const current = projects[index];
    const target = projects[targetIndex];
    setBusyId(current.id);
    setError(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/portfolio/projects/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        fetch(`/api/portfolio/projects/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ]);
      if (!resA.ok || !resB.ok) {
        setError("No se pudo reordenar.");
        return;
      }
      const next = [...projects];
      next[index] = { ...target, sortOrder: current.sortOrder };
      next[targetIndex] = { ...current, sortOrder: target.sortOrder };
      setProjects(next);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFeatured = async (project: AdminPortfolioListItem) => {
    setBusyId(project.id);
    try {
      const res = await fetch(`/api/portfolio/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !project.isFeatured }),
      });
      if (res.ok) {
        setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, isFeatured: !p.isFeatured } : p)));
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (project: AdminPortfolioListItem) => {
    if (!window.confirm(`¿Eliminar "${project.titleEs}"? Se puede restaurar desde la base de datos, pero desaparece de todos los listados.`)) return;
    setBusyId(project.id);
    try {
      const res = await fetch(`/api/portfolio/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Portafolio</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Casos de estudio del sitio público — borrador, publicado o archivado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/portafolio/tecnologias">
            <Button variant="secondary">
              <Wrench size={14} />
              <span>Tecnologías</span>
            </Button>
          </Link>
          {canWrite && (
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              <span>Nuevo caso</span>
            </Button>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {projects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Sin casos todavía"
            description="Crea el primer caso de estudio del portafolio."
            action={canWrite ? { label: "Nuevo caso", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th className="px-5 py-3.5">Caso</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-center">Destacado</th>
                  <th className="px-5 py-3.5 text-center">Orden</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {projects.map((project, index) => {
                  const isBusy = busyId === project.id;
                  return (
                    <tr key={project.id}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/portafolio/${project.id}`}
                          className="flex items-center gap-3 outline-none rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
                            {project.coverImage ? (
                              <Image
                                src={project.coverImage.variants.sm}
                                alt=""
                                width={64}
                                height={40}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-foreground/30">
                                <Briefcase size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{project.titleEs}</div>
                            <div className="text-[10px] text-foreground/50 font-mono truncate">/{project.slug}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONES[project.status]}>{STATUS_LABELS[project.status]}</Badge>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleToggleFeatured(project)}
                          disabled={!canWrite || isBusy}
                          aria-label={project.isFeatured ? "Quitar destacado" : "Marcar como destacado"}
                          aria-pressed={project.isFeatured}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Star size={16} className={project.isFeatured ? "fill-amber-400 text-amber-400" : ""} />
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMove(index, -1)}
                            disabled={!canWrite || isBusy || index === 0}
                            aria-label="Subir"
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/10 transition-colors disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMove(index, 1)}
                            disabled={!canWrite || isBusy || index === projects.length - 1}
                            aria-label="Bajar"
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/10 transition-colors disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(project)}
                            disabled={isBusy}
                            aria-label={`Eliminar ${project.titleEs}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground/50 hover:bg-red-500/10 hover:text-red-700 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            router.push(`/dashboard/portafolio/${id}`);
          }}
        />
      )}
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [industryIcon, setIndustryIcon] = useState<string>(PORTFOLIO_ICON_NAMES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), industryIcon }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el caso.");
        return;
      }
      onCreated(data.projectId);
    } catch {
      setError("Ocurrió un error de red. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Nuevo caso de portafolio" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">Nombre del cliente/proyecto (solo de referencia, se edita después)</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej. Acme Real Estate"
            className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">Slug (URL: /portafolio/…)</label>
          <input
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="acme-real-estate"
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground font-mono outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">Ícono de industria</label>
          <select
            value={industryIcon}
            onChange={(e) => setIndustryIcon(e.target.value)}
            className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            {PORTFOLIO_ICON_NAMES.map((iconName) => (
              <option key={iconName} value={iconName} className="bg-background">{iconName}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !slug.trim()}
          className="w-full rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {isSubmitting ? "Creando…" : "Crear y editar"}
        </button>
      </form>
    </ModalShell>
  );
}
