"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Star, Upload, X } from "lucide-react";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { TechIcon } from "@/components/portfolio/TechIcon";
import {
  PORTFOLIO_ICON_NAMES,
  type PortfolioStatus,
  type PortfolioTechnology,
} from "@/content/portfolioShared";
import type {
  AdminPortfolioDetail,
  AdminPortfolioImage,
  AdminPortfolioMetric,
  AdminPortfolioTranslation,
} from "@/lib/queries/portfolio";
import type { Locale } from "@/lib/i18n";

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

const LOCALE_LABELS: Record<Locale, string> = { es: "Español", en: "English", fr: "Français" };
const LOCALES: Locale[] = ["es", "en", "fr"];

const inputClasses =
  "w-full rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const labelClasses = "block text-xs font-semibold text-foreground/70 mb-1.5";

type Tab = "general" | "content" | "tech" | "images" | "metrics";
const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "content", label: "Contenido" },
  { key: "tech", label: "Tecnologías" },
  { key: "images", label: "Imágenes" },
  { key: "metrics", label: "Métricas" },
];

export function PortfolioEditor({
  project,
  allTechnologies,
  canWrite,
}: {
  project: AdminPortfolioDetail;
  allTechnologies: PortfolioTechnology[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [status, setStatus] = useState(project.status);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const handleStatusChange = async (next: PortfolioStatus) => {
    setIsChangingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/portfolio/projects/${project.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || "No se pudo cambiar el estado.");
        return;
      }
      setStatus(next);
      router.refresh();
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/portafolio"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors outline-none rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft size={14} />
        Volver al portafolio
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.translations.es?.title || `/${project.slug}`}</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
            <span className="text-[11px] font-mono text-foreground/50">/{project.slug}</span>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {status !== "draft" && (
              <Button variant="secondary" onClick={() => handleStatusChange("draft")} disabled={isChangingStatus}>
                Volver a borrador
              </Button>
            )}
            {status !== "archived" && (
              <Button variant="secondary" onClick={() => handleStatusChange("archived")} disabled={isChangingStatus}>
                Archivar
              </Button>
            )}
            {status !== "published" && (
              <Button variant="accent" onClick={() => handleStatusChange("published")} disabled={isChangingStatus}>
                Publicar
              </Button>
            )}
          </div>
        )}
      </div>

      {statusError && <Alert tone="error">{statusError}</Alert>}

      <nav aria-label="Secciones del editor" className="flex flex-wrap gap-2 border-b border-foreground/10 pb-3">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            aria-current={activeTab === key ? "page" : undefined}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeTab === key ? "bg-accent-strong text-white" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "general" && <GeneralTab project={project} canWrite={canWrite} />}
      {activeTab === "content" && <ContentTab projectId={project.id} translations={project.translations} canWrite={canWrite} />}
      {activeTab === "tech" && (
        <TechnologiesTab projectId={project.id} allTechnologies={allTechnologies} initialSelected={project.technologies} canWrite={canWrite} />
      )}
      {activeTab === "images" && (
        <ImagesTab projectId={project.id} initialImages={project.images} initialCoverImageId={project.coverImageId} canWrite={canWrite} />
      )}
      {activeTab === "metrics" && <MetricsTab projectId={project.id} initialMetrics={project.metrics} canWrite={canWrite} />}
    </div>
  );
}

function GeneralTab({ project, canWrite }: { project: AdminPortfolioDetail; canWrite: boolean }) {
  const router = useRouter();
  const [slug, setSlug] = useState(project.slug);
  const [liveUrl, setLiveUrl] = useState(project.liveUrl ?? "");
  const [industryIcon, setIndustryIcon] = useState(project.industryIcon);
  const [isFeatured, setIsFeatured] = useState(project.isFeatured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/portfolio/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), liveUrl: liveUrl.trim() || null, industryIcon, isFeatured }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-4 rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Guardado.</Alert>}
      <div>
        <label className={labelClasses}>Slug (URL: /portafolio/…)</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!canWrite} pattern="^[a-z0-9]+(-[a-z0-9]+)*$" required className={`${inputClasses} font-mono`} />
      </div>
      <div>
        <label className={labelClasses}>URL en vivo del sitio (opcional)</label>
        <input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} disabled={!canWrite} type="url" placeholder="https://…" className={inputClasses} />
      </div>
      <div>
        <label className={labelClasses}>Ícono de industria</label>
        <select value={industryIcon} onChange={(e) => setIndustryIcon(e.target.value)} disabled={!canWrite} className={`${inputClasses} cursor-pointer`}>
          {PORTFOLIO_ICON_NAMES.map((iconName) => (
            <option key={iconName} value={iconName} className="bg-background">{iconName}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-foreground/80 cursor-pointer">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} disabled={!canWrite} className="h-4 w-4 accent-accent" />
        <Star size={14} className={isFeatured ? "fill-amber-400 text-amber-400" : "text-foreground/40"} />
        Caso destacado
      </label>
      {canWrite && (
        <button type="submit" disabled={isSaving} className="rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          {isSaving ? "Guardando…" : "Guardar"}
        </button>
      )}
    </form>
  );
}

function emptyTranslation(locale: Locale): AdminPortfolioTranslation {
  return { locale, title: "", clientLabel: "", summary: "", challenge: "", solution: "", results: "", capabilities: [] };
}

function ContentTab({
  projectId,
  translations,
  canWrite,
}: {
  projectId: number;
  translations: Record<Locale, AdminPortfolioTranslation | null>;
  canWrite: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("es");
  const [drafts, setDrafts] = useState<Record<Locale, AdminPortfolioTranslation>>({
    es: translations.es ?? emptyTranslation("es"),
    en: translations.en ?? emptyTranslation("en"),
    fr: translations.fr ?? emptyTranslation("fr"),
  });
  const [capabilitiesText, setCapabilitiesText] = useState<Record<Locale, string>>({
    es: (translations.es?.capabilities ?? []).join(", "),
    en: (translations.en?.capabilities ?? []).join(", "),
    fr: (translations.fr?.capabilities ?? []).join(", "),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const current = drafts[locale];
  const update = (field: keyof AdminPortfolioTranslation, value: string) => {
    setDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const capabilities = capabilitiesText[locale]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/portfolio/projects/${projectId}/translations/${locale}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, capabilities }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], capabilities } }));
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => {
              setLocale(l);
              setSaved(false);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              locale === l ? "bg-accent/20 text-accent border border-accent/30" : "text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            {LOCALE_LABELS[l]}
            {!translations[l] && <span className="ml-1.5 text-[9px] uppercase text-foreground/40">(vacío)</span>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-4 rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Guardado.</Alert>}
        <div>
          <label className={labelClasses}>Título</label>
          <input value={current.title} onChange={(e) => update("title", e.target.value)} disabled={!canWrite} required className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>Cliente (ej. &quot;Acme S.A.S. · Sector Inmobiliario&quot;)</label>
          <input value={current.clientLabel} onChange={(e) => update("clientLabel", e.target.value)} disabled={!canWrite} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>Resumen (tarjeta del portafolio)</label>
          <textarea value={current.summary} onChange={(e) => update("summary", e.target.value)} disabled={!canWrite} rows={3} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>El reto</label>
          <textarea value={current.challenge} onChange={(e) => update("challenge", e.target.value)} disabled={!canWrite} rows={3} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>La solución</label>
          <textarea value={current.solution} onChange={(e) => update("solution", e.target.value)} disabled={!canWrite} rows={3} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>Los resultados</label>
          <textarea value={current.results} onChange={(e) => update("results", e.target.value)} disabled={!canWrite} rows={3} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>Capacidades, separadas por coma (ej. &quot;Catálogo Digital, SEO &amp; Rendimiento&quot;)</label>
          <input
            value={capabilitiesText[locale]}
            onChange={(e) => setCapabilitiesText((prev) => ({ ...prev, [locale]: e.target.value }))}
            disabled={!canWrite}
            className={inputClasses}
          />
        </div>
        {canWrite && (
          <button type="submit" disabled={isSaving} className="rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {isSaving ? "Guardando…" : `Guardar ${LOCALE_LABELS[locale]}`}
          </button>
        )}
      </form>
    </div>
  );
}

function TechnologiesTab({
  projectId,
  allTechnologies,
  initialSelected,
  canWrite,
}: {
  projectId: number;
  allTechnologies: PortfolioTechnology[];
  initialSelected: PortfolioTechnology[];
  canWrite: boolean;
}) {
  const [selected, setSelected] = useState<PortfolioTechnology[]>(initialSelected);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedIds = new Set(selected.map((t) => t.id));
  const available = allTechnologies.filter((t) => !selectedIds.has(t.id));

  const groupedAvailable = available.reduce<Record<string, PortfolioTechnology[]>>((acc, tech) => {
    (acc[tech.category] ??= []).push(tech);
    return acc;
  }, {});

  const toggleAdd = (tech: PortfolioTechnology) => setSelected((prev) => [...prev, tech]);
  const remove = (id: number) => setSelected((prev) => prev.filter((t) => t.id !== id));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/portfolio/projects/${projectId}/technologies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technologyIds: selected.map((t) => t.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Seleccionadas ({selected.length})</h2>
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Guardado.</Alert>}
        {selected.length === 0 ? (
          <p className="text-xs text-foreground/50">Ninguna todavía — elige del catálogo a la derecha.</p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((tech, index) => (
              <li key={tech.id} className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2">
                <TechIcon technology={tech} size={16} />
                <span className="flex-1 text-xs font-medium text-foreground">{tech.name}</span>
                <button type="button" onClick={() => move(index, -1)} disabled={!canWrite || index === 0} aria-label="Subir" className="flex h-8 w-8 items-center justify-center rounded text-foreground/50 hover:bg-foreground/10 disabled:opacity-30">
                  <ArrowUp size={12} />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={!canWrite || index === selected.length - 1} aria-label="Bajar" className="flex h-8 w-8 items-center justify-center rounded text-foreground/50 hover:bg-foreground/10 disabled:opacity-30">
                  <ArrowDown size={12} />
                </button>
                {canWrite && (
                  <button type="button" onClick={() => remove(tech.id)} aria-label={`Quitar ${tech.name}`} className="flex h-8 w-8 items-center justify-center rounded text-foreground/50 hover:bg-red-500/10 hover:text-red-700">
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <button onClick={handleSave} disabled={isSaving} className="w-full rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {isSaving ? "Guardando…" : "Guardar tecnologías"}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6 space-y-4 max-h-[500px] overflow-y-auto">
        <h2 className="text-sm font-bold text-foreground">Catálogo</h2>
        {Object.keys(groupedAvailable).length === 0 ? (
          <p className="text-xs text-foreground/50">Ya agregaste todo el catálogo, o está vacío — créalas en &quot;Tecnologías&quot;.</p>
        ) : (
          Object.entries(groupedAvailable).map(([category, techs]) => (
            <div key={category} className="space-y-1.5">
              <h3 className="text-[10px] font-mono uppercase tracking-wide text-foreground/40">{category}</h3>
              {techs.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => toggleAdd(tech)}
                  disabled={!canWrite}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-foreground/10 transition-colors disabled:opacity-40"
                >
                  <TechIcon technology={tech} size={16} />
                  <span className="text-xs text-foreground/80">{tech.name}</span>
                  <Plus size={12} className="ml-auto text-foreground/40" />
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ImagesTab({
  projectId,
  initialImages,
  initialCoverImageId,
  canWrite,
}: {
  projectId: number;
  initialImages: AdminPortfolioImage[];
  initialCoverImageId: number | null;
  canWrite: boolean;
}) {
  const [images, setImages] = useState(initialImages);
  const [coverImageId, setCoverImageId] = useState(initialCoverImageId);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/portfolio/projects/${projectId}/images`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo subir la imagen.");
        return;
      }
      setImages((prev) => [...prev, { ...data.image, alt: {} }]);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!window.confirm("¿Eliminar esta imagen?")) return;
    const res = await fetch(`/api/portfolio/images/${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      if (coverImageId === imageId) setCoverImageId(null);
    }
  };

  const handleSetCover = async (imageId: number) => {
    const res = await fetch(`/api/portfolio/projects/${projectId}/cover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    if (res.ok) setCoverImageId(imageId);
  };

  const handleAltChange = async (imageId: number, locale: Locale, value: string) => {
    setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, alt: { ...img.alt, [locale]: value } } : img)));
    await fetch(`/api/portfolio/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt: { [locale]: value } }),
    });
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    await fetch(`/api/portfolio/projects/${projectId}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageIds: next.map((img) => img.id) }),
    });
  };

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {canWrite && (
        <div>
          <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-accent-strong px-4 text-xs font-bold text-white hover:brightness-90 transition-all">
            <Upload size={14} />
            {isUploading ? "Subiendo…" : "Subir imagen"}
          </label>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={isUploading} className="sr-only" />
        </div>
      )}

      {images.length === 0 ? (
        <p className="text-xs text-foreground/50">Sin imágenes todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((img, index) => (
            <div key={img.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 overflow-hidden">
              <div className="relative aspect-video bg-foreground/10">
                <Image src={img.variants.md} alt="" fill className="object-cover" unoptimized />
                {coverImageId === img.id && (
                  <span className="absolute top-2 left-2 rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-bold text-white">Portada</span>
                )}
              </div>
              <div className="p-3 space-y-2">
                {LOCALES.map((l) => (
                  <input
                    key={l}
                    value={img.alt[l] ?? ""}
                    onChange={(e) => handleAltChange(img.id, l, e.target.value)}
                    disabled={!canWrite}
                    placeholder={`Texto alternativo (${LOCALE_LABELS[l]})`}
                    className="w-full rounded-lg border border-foreground/15 bg-foreground/[0.02] px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
                  />
                ))}
                {canWrite && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button onClick={() => handleSetCover(img.id)} disabled={coverImageId === img.id} className="flex-1 rounded-lg border border-foreground/15 px-2 py-1.5 text-[10px] font-semibold text-foreground/70 hover:bg-foreground/10 disabled:opacity-40">
                      Usar como portada
                    </button>
                    <button onClick={() => handleMove(index, -1)} disabled={index === 0} aria-label="Subir" className="flex h-8 w-8 items-center justify-center rounded text-foreground/50 hover:bg-foreground/10 disabled:opacity-30">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => handleMove(index, 1)} disabled={index === images.length - 1} aria-label="Bajar" className="flex h-8 w-8 items-center justify-center rounded text-foreground/50 hover:bg-foreground/10 disabled:opacity-30">
                      <ArrowDown size={12} />
                    </button>
                    <button onClick={() => handleDelete(img.id)} aria-label="Eliminar imagen" className="flex h-8 w-8 items-center justify-center rounded text-foreground/50 hover:bg-red-500/10 hover:text-red-700">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsTab({
  projectId,
  initialMetrics,
  canWrite,
}: {
  projectId: number;
  initialMetrics: AdminPortfolioMetric[];
  canWrite: boolean;
}) {
  const [metrics, setMetrics] = useState(initialMetrics.map((m) => ({ value: m.value, label: m.label })));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = (index: number, field: "value" | Locale, value: string) => {
    setMetrics((prev) =>
      prev.map((m, i) => (i === index ? (field === "value" ? { ...m, value } : { ...m, label: { ...m.label, [field]: value } }) : m))
    );
  };

  const add = () => {
    if (metrics.length >= 6) return;
    setMetrics((prev) => [...prev, { value: "", label: {} }]);
  };
  const remove = (index: number) => setMetrics((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/portfolio/projects/${projectId}/metrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics: metrics.filter((m) => m.value.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Guardado.</Alert>}
      <p className="text-xs text-foreground/60">Resultados medibles del caso (ej. &quot;−60%&quot; / &quot;tiempo de despacho&quot;). Máximo 6.</p>
      {metrics.map((metric, index) => (
        <div key={index} className="rounded-lg border border-foreground/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={metric.value}
              onChange={(e) => update(index, "value", e.target.value)}
              disabled={!canWrite}
              placeholder="Valor (ej. −60%)"
              className={`${inputClasses} font-mono w-32`}
            />
            {canWrite && (
              <button type="button" onClick={() => remove(index)} aria-label="Quitar métrica" className="flex h-9 w-9 items-center justify-center rounded text-foreground/50 hover:bg-red-500/10 hover:text-red-700">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LOCALES.map((l) => (
              <input
                key={l}
                value={metric.label[l] ?? ""}
                onChange={(e) => update(index, l, e.target.value)}
                disabled={!canWrite}
                placeholder={`Etiqueta (${LOCALE_LABELS[l]})`}
                className="rounded-lg border border-foreground/15 bg-foreground/[0.02] px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
              />
            ))}
          </div>
        </div>
      ))}
      {canWrite && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={add} disabled={metrics.length >= 6} className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold text-foreground/70 hover:bg-foreground/10 disabled:opacity-40">
            <Plus size={12} className="inline mr-1" />
            Agregar métrica
          </button>
          <button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {isSaving ? "Guardando…" : "Guardar métricas"}
          </button>
        </div>
      )}
    </div>
  );
}
