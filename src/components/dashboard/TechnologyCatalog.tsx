"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Pencil, X, Search } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { TechIcon } from "@/components/portfolio/TechIcon";
import { PORTFOLIO_TECH_CATEGORIES, type PortfolioTechCategory, type PortfolioTechnology } from "@/content/portfolioShared";

type TechnologyWithUsage = PortfolioTechnology & { projectCount: number };

const inputClasses =
  "w-full rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const labelClasses = "block text-xs font-semibold text-foreground/70 mb-1.5";

export function TechnologyCatalog({
  initialTechnologies,
  canWrite,
}: {
  initialTechnologies: TechnologyWithUsage[];
  canWrite: boolean;
}) {
  const [technologies, setTechnologies] = useState(initialTechnologies);
  const [editing, setEditing] = useState<TechnologyWithUsage | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (tech: TechnologyWithUsage) => {
    if (tech.projectCount > 0) return;
    if (!window.confirm(`¿Eliminar "${tech.name}" del catálogo?`)) return;
    setError(null);
    const res = await fetch(`/api/portfolio/technologies/${tech.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo eliminar.");
      return;
    }
    setTechnologies((prev) => prev.filter((t) => t.id !== tech.id));
  };

  const grouped = technologies.reduce<Record<string, TechnologyWithUsage[]>>((acc, tech) => {
    (acc[tech.category] ??= []).push(tech);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/portafolio"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors outline-none rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft size={14} />
        Volver al portafolio
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tecnologías</h1>
          <p className="mt-1 text-xs text-foreground/70">Catálogo reutilizable de tecnologías para los casos del portafolio.</p>
        </div>
        {canWrite && (
          <Button variant="accent" onClick={() => setEditing("new")}>
            <Plus size={14} />
            <span>Nueva tecnología</span>
          </Button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {technologies.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState
            icon={Search}
            title="Catálogo vacío"
            description="Agrega la primera tecnología para poder asignarla a un caso."
            action={canWrite ? { label: "Nueva tecnología", onClick: () => setEditing("new") } : undefined}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {PORTFOLIO_TECH_CATEGORIES.filter((category) => grouped[category]?.length).map((category) => (
            <div key={category}>
              <h2 className="mb-2 text-[10px] font-mono uppercase tracking-wide text-foreground/40">{category}</h2>
              <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 divide-y divide-foreground/10">
                {grouped[category].map((tech) => (
                  <div key={tech.id} className="flex items-center gap-3 px-4 py-3">
                    <TechIcon technology={tech} size={20} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{tech.name}</div>
                      <div className="text-[10px] font-mono text-foreground/50">
                        {tech.slug} · {tech.projectCount} {tech.projectCount === 1 ? "caso" : "casos"}
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(tech)}
                          aria-label={`Editar ${tech.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tech)}
                          disabled={tech.projectCount > 0}
                          aria-label={`Eliminar ${tech.name}`}
                          title={tech.projectCount > 0 ? "En uso — no se puede eliminar" : undefined}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/50 hover:bg-red-500/10 hover:text-red-700 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TechnologyModal
          technology={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setTechnologies((prev) => {
              const exists = prev.some((t) => t.id === saved.id);
              return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved];
            });
          }}
        />
      )}
    </div>
  );
}

interface IconSearchResult {
  slug: string;
  title: string;
}

function TechnologyModal({
  technology,
  onClose,
  onSaved,
}: {
  technology: TechnologyWithUsage | null;
  onClose: () => void;
  onSaved: (technology: TechnologyWithUsage) => void;
}) {
  const titleId = useId();
  const [name, setName] = useState(technology?.name ?? "");
  const [slug, setSlug] = useState(technology?.slug ?? "");
  const [category, setCategory] = useState<PortfolioTechCategory>(technology?.category ?? PORTFOLIO_TECH_CATEGORIES[0]);
  const [iconSource, setIconSource] = useState<"simple-icons" | "custom">(technology?.iconSource ?? "simple-icons");
  const [iconRef, setIconRef] = useState(technology?.iconRef ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(technology?.websiteUrl ?? "");
  const [iconQuery, setIconQuery] = useState("");
  const [iconResults, setIconResults] = useState<IconSearchResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (iconSource !== "simple-icons" || iconQuery.trim().length < 2) {
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/portfolio/technologies/icons/search?q=${encodeURIComponent(iconQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setIconResults(data.results ?? []);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [iconQuery, iconSource]);

  const visibleIconResults = iconSource === "simple-icons" && iconQuery.trim().length >= 2 ? iconResults : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        category,
        iconSource,
        iconRef: iconRef.trim(),
        websiteUrl: websiteUrl.trim() || null,
      };
      const url = technology ? `/api/portfolio/technologies/${technology.id}` : "/api/portfolio/technologies";
      const method = technology ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(technology ? payload : { ...payload, slug: slug.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      onSaved({ ...data.technology, projectCount: technology?.projectCount ?? 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title={technology ? `Editar ${technology.name}` : "Nueva tecnología"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <label className={labelClasses}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClasses} />
        </div>
        {!technology && (
          <div>
            <label className={labelClasses}>Slug (identificador único, no editable después)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="^[a-z0-9-]+$"
              placeholder="ej. nextjs"
              className={`${inputClasses} font-mono`}
            />
          </div>
        )}
        <div>
          <label className={labelClasses}>Categoría</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as PortfolioTechCategory)} className={`${inputClasses} cursor-pointer`}>
            {PORTFOLIO_TECH_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-background">{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClasses}>Origen del ícono</label>
          <select
            value={iconSource}
            onChange={(e) => {
              setIconSource(e.target.value as "simple-icons" | "custom");
              setIconRef("");
            }}
            className={`${inputClasses} cursor-pointer`}
          >
            <option value="simple-icons" className="bg-background">Simple Icons (buscar)</option>
            <option value="custom" className="bg-background">URL personalizada</option>
          </select>
        </div>

        {iconSource === "simple-icons" ? (
          <div className="space-y-2">
            <label className={labelClasses}>Buscar ícono</label>
            <input
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              placeholder="ej. react, postgresql…"
              className={inputClasses}
            />
            {iconRef && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-foreground">
                <span className="font-mono">{iconRef}</span>
                <button type="button" onClick={() => setIconRef("")} className="ml-auto text-foreground/50 hover:text-foreground">
                  <X size={12} />
                </button>
              </div>
            )}
            {visibleIconResults.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-foreground/10 divide-y divide-foreground/10">
                {visibleIconResults.map((result) => (
                  <li key={result.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setIconRef(result.slug);
                        setIconResults([]);
                        setIconQuery("");
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-foreground/80 hover:bg-foreground/10"
                    >
                      {result.title} <span className="font-mono text-foreground/40">({result.slug})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div>
            <label className={labelClasses}>URL de la imagen del ícono</label>
            <input value={iconRef} onChange={(e) => setIconRef(e.target.value)} required type="url" placeholder="https://…" className={inputClasses} />
          </div>
        )}

        <div>
          <label className={labelClasses}>Sitio web (opcional)</label>
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} type="url" placeholder="https://…" className={inputClasses} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !iconRef.trim() || (!technology && !slug.trim())}
          className="w-full rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {isSubmitting ? "Guardando…" : technology ? "Guardar cambios" : "Crear tecnología"}
        </button>
      </form>
    </ModalShell>
  );
}
