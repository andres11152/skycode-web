"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {  ArrowUp, ArrowDown, Trash2, Plus, Star,  X } from "lucide-react";
import { Badge } from "./ui/Badge";
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
import { PORTFOLIO_STATUS } from "./statusMeta";
import { useFeedback } from "./ui/Feedback";
import { PageHeader } from "./ui/PageHeader";
import { Tabs, tabId, tabPanelId } from "./ui/Tabs";
import { FileDropzone } from "./ui/FileDropzone";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import { UnsavedNotice } from "./ui/UnsavedNotice";

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
      <PageHeader
        back={{ href: "/dashboard/portafolio", label: "Volver al portafolio" }}
        title={project.translations.es?.title || `/${project.slug}`}
        badge={
          <>
            <Badge tone={PORTFOLIO_STATUS[status].tone}>{PORTFOLIO_STATUS[status].label}</Badge>
            <span className="font-mono text-xs text-foreground/70">/{project.slug}</span>
          </>
        }
        actions={
          canWrite ? (
            <>
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
            </>
          ) : undefined
        }
      />

      {statusError && <Alert tone="error">{statusError}</Alert>}

      <Tabs idBase="portfolio-editor" label="Secciones del editor" items={TABS.map(({ key, label }) => ({ id: key, label }))} value={activeTab} onChange={setActiveTab} />

      {/* Los paneles siguen MONTADOS (solo ocultos): cambiar de pestaña desmontaba la
          anterior y se perdía todo lo escrito sin guardar. */}
      <div role="tabpanel" id={tabPanelId("portfolio-editor", "general")} aria-labelledby={tabId("portfolio-editor", "general")} hidden={activeTab !== "general"}>
        <GeneralTab project={project} canWrite={canWrite} />
      </div>
      <div role="tabpanel" id={tabPanelId("portfolio-editor", "content")} aria-labelledby={tabId("portfolio-editor", "content")} hidden={activeTab !== "content"}>
        <ContentTab projectId={project.id} translations={project.translations} canWrite={canWrite} />
      </div>
      <div role="tabpanel" id={tabPanelId("portfolio-editor", "tech")} aria-labelledby={tabId("portfolio-editor", "tech")} hidden={activeTab !== "tech"}>
        <TechnologiesTab projectId={project.id} allTechnologies={allTechnologies} initialSelected={project.technologies} canWrite={canWrite} />
      </div>
      <div role="tabpanel" id={tabPanelId("portfolio-editor", "images")} aria-labelledby={tabId("portfolio-editor", "images")} hidden={activeTab !== "images"}>
        <ImagesTab projectId={project.id} initialImages={project.images} initialCoverImageId={project.coverImageId} canWrite={canWrite} />
      </div>
      <div role="tabpanel" id={tabPanelId("portfolio-editor", "metrics")} aria-labelledby={tabId("portfolio-editor", "metrics")} hidden={activeTab !== "metrics"}>
        <MetricsTab projectId={project.id} initialMetrics={project.metrics} canWrite={canWrite} />
      </div>
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
  const { dirty, markSaved } = useUnsavedChanges({ slug, liveUrl, industryIcon, isFeatured });

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
      markSaved();
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
        <label htmlFor="pe-field-1" className={labelClasses}>Slug (URL: /portafolio/…)</label>
        <input
          id="pe-field-1" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!canWrite} pattern="^[a-z0-9]+(-[a-z0-9]+)*$" required className={`${inputClasses} font-mono`} />
      </div>
      <div>
        <label htmlFor="pe-field-2" className={labelClasses}>URL en vivo del sitio (opcional)</label>
        <input
          id="pe-field-2" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} disabled={!canWrite} type="url" placeholder="https://…" className={inputClasses} />
      </div>
      <div>
        <label htmlFor="pe-field-3" className={labelClasses}>Ícono de industria</label>
        <select
          id="pe-field-3" value={industryIcon} onChange={(e) => setIndustryIcon(e.target.value)} disabled={!canWrite} className={`${inputClasses} cursor-pointer`}>
          {PORTFOLIO_ICON_NAMES.map((iconName) => (
            <option key={iconName} value={iconName} className="bg-background">{iconName}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-foreground/80 cursor-pointer">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} disabled={!canWrite} className="h-4 w-4 accent-accent" />
        <Star size={14} className={isFeatured ? "fill-warning text-warning" : "text-foreground/70"} />
        Caso destacado
      </label>
      {canWrite && (
        <>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          {isSaving ? "Guardando…" : "Guardar"}
        </button>
        <span className="ml-3 align-middle"><UnsavedNotice dirty={dirty} /></span>
        </>
      )}
    </form>
  );
}

function emptyTranslation(locale: Locale): AdminPortfolioTranslation {
  return {
    locale,
    title: "",
    clientLabel: "",
    summary: "",
    challenge: "",
    solution: "",
    results: "",
    capabilities: [],
    clientContext: "",
    architecture: "",
    process: "",
    testimonialQuote: "",
    testimonialAuthor: "",
    testimonialRole: "",
  };
}

/**
 * Capítulos del caso en el orden en que aparecen en la página pública. Un
 * capítulo vacío no se muestra en el sitio (no queda un título sin
 * contenido). Un párrafo o viñeta con `{{TODO: …}}` tampoco se publica: sirve
 * para marcar dónde falta un dato real sin que llegue a producción.
 */
const CHAPTER_FIELDS: { field: "clientContext" | "challenge" | "solution" | "architecture" | "process" | "results"; label: string; rows: number }[] = [
  { field: "clientContext", label: "Contexto del cliente", rows: 5 },
  { field: "challenge", label: "El problema", rows: 5 },
  { field: "solution", label: "La solución", rows: 6 },
  { field: "architecture", label: "Arquitectura y stack (el listado con íconos está en la pestaña Tecnologías)", rows: 6 },
  { field: "process", label: "Proceso y tiempos", rows: 6 },
  { field: "results", label: "Resultados (las cifras destacadas van en la pestaña Métricas)", rows: 5 },
];

const hasTodoMarker = (value: string) => value.includes("{{TODO");

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
  const { dirty, markSaved } = useUnsavedChanges({ drafts, capabilitiesText });

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
      markSaved();
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
              locale === l ? "bg-accent/20 text-accent-strong border border-accent/30" : "text-foreground/70 hover:bg-foreground/10"
            }`}
          >
            {LOCALE_LABELS[l]}
            {!translations[l] && <span className="ml-1.5 text-[11px] uppercase text-foreground/70">(vacío)</span>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-4 rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Guardado.</Alert>}
        <div>
          <label htmlFor="pe-field-4" className={labelClasses}>Título</label>
          <input
            id="pe-field-4" value={current.title} onChange={(e) => update("title", e.target.value)} disabled={!canWrite} required className={inputClasses} />
        </div>
        <div>
          <label htmlFor="pe-field-5" className={labelClasses}>Cliente (ej. &quot;Acme S.A.S. · Sector Inmobiliario&quot;)</label>
          <input
            id="pe-field-5" value={current.clientLabel} onChange={(e) => update("clientLabel", e.target.value)} disabled={!canWrite} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="pe-field-6" className={labelClasses}>Resumen (tarjeta del portafolio)</label>
          <textarea
            id="pe-field-6" value={current.summary} onChange={(e) => update("summary", e.target.value)} disabled={!canWrite} rows={3} className={inputClasses} />
        </div>
        <p className="text-xs leading-relaxed text-foreground/70">
          Cada capítulo admite varios párrafos (sepáralos con una línea en blanco) y listas (una viñeta por línea, empezando con &quot;- &quot;). Un capítulo vacío no se muestra en el sitio. Lo que aún no tenga un dato real
          verificado se marca con <code className="rounded bg-foreground/5 px-1">{"{{TODO: qué dato falta}}"}</code> en su propio párrafo: se puede guardar, y la página pública lo omite.
        </p>
        {CHAPTER_FIELDS.map(({ field, label, rows }) => (
          <div key={field}>
            <label htmlFor={`pe-chapter-${field}`} className={labelClasses}>
              {label}
              {hasTodoMarker(current[field]) && (
                <span className="ml-2 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">Datos pendientes</span>
              )}
            </label>
            <textarea
              id={`pe-chapter-${field}`}
              value={current[field]}
              onChange={(e) => update(field, e.target.value)}
              disabled={!canWrite}
              rows={rows}
              className={inputClasses}
            />
          </div>
        ))}
        <fieldset className="space-y-4 rounded-lg border border-foreground/10 p-4">
          <legend className="px-1 text-xs font-semibold text-foreground/70">Testimonio (solo se publica con cita, nombre y cargo reales)</legend>
          <div>
            <label htmlFor="pe-testimonial-quote" className={labelClasses}>Cita del cliente</label>
            <textarea
              id="pe-testimonial-quote"
              value={current.testimonialQuote}
              onChange={(e) => update("testimonialQuote", e.target.value)}
              disabled={!canWrite}
              rows={3}
              className={inputClasses}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pe-testimonial-author" className={labelClasses}>Nombre de quien lo dice</label>
              <input
                id="pe-testimonial-author"
                value={current.testimonialAuthor}
                onChange={(e) => update("testimonialAuthor", e.target.value)}
                disabled={!canWrite}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="pe-testimonial-role" className={labelClasses}>Cargo</label>
              <input
                id="pe-testimonial-role"
                value={current.testimonialRole}
                onChange={(e) => update("testimonialRole", e.target.value)}
                disabled={!canWrite}
                className={inputClasses}
              />
            </div>
          </div>
        </fieldset>
        <div>
          <label htmlFor="pe-field-10" className={labelClasses}>Capacidades, separadas por coma (ej. &quot;Catálogo Digital, SEO &amp; Rendimiento&quot;)</label>
          <input
            id="pe-field-10"
            value={capabilitiesText[locale]}
            onChange={(e) => setCapabilitiesText((prev) => ({ ...prev, [locale]: e.target.value }))}
            disabled={!canWrite}
            className={inputClasses}
          />
        </div>
        {canWrite && (
          <>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-accent-strong px-4 py-2.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {isSaving ? "Guardando…" : `Guardar ${LOCALE_LABELS[locale]}`}
          </button>
        <span className="ml-3 align-middle"><UnsavedNotice dirty={dirty} /></span>
          </>
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
          <p className="text-xs text-foreground/70">Ninguna todavía — elige del catálogo a la derecha.</p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((tech, index) => (
              <li key={tech.id} className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2">
                <TechIcon technology={tech} size={16} />
                <span className="flex-1 text-xs font-medium text-foreground">{tech.name}</span>
                <button type="button" onClick={() => move(index, -1)} disabled={!canWrite || index === 0} aria-label="Subir" className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-foreground/10 disabled:opacity-30">
                  <ArrowUp size={12} />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={!canWrite || index === selected.length - 1} aria-label="Bajar" className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-foreground/10 disabled:opacity-30">
                  <ArrowDown size={12} />
                </button>
                {canWrite && (
                  <button type="button" onClick={() => remove(tech.id)} aria-label={`Quitar ${tech.name}`} className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-danger/10 hover:text-danger">
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
          <p className="text-xs text-foreground/70">Ya agregaste todo el catálogo, o está vacío — créalas en &quot;Tecnologías&quot;.</p>
        ) : (
          Object.entries(groupedAvailable).map(([category, techs]) => (
            <div key={category} className="space-y-1.5">
              <h3 className="text-[11px] font-mono uppercase tracking-wide text-foreground/70">{category}</h3>
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
                  <Plus size={12} className="ml-auto text-foreground/70" />
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

  const handleUpload = async (file: File) => {
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
    }
  };

  const feedback = useFeedback();
  const handleDelete = async (imageId: number) => {
    if (!(await feedback.confirm({ title: "¿Eliminar esta imagen?", tone: "danger" }))) return;
    const res = await fetch(`/api/portfolio/images/${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      if (coverImageId === imageId) setCoverImageId(null);
      feedback.toast({ message: "Imagen eliminada." });
    } else {
      feedback.toast({ tone: "error", message: "No se pudo eliminar la imagen." });
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

  // El texto alternativo se guarda al SALIR del campo, no en cada tecla: antes
  // cada letra disparaba un PATCH (y un error de red pasaba sin avisar).
  const handleAltChange = (imageId: number, locale: Locale, value: string) => {
    setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, alt: { ...img.alt, [locale]: value } } : img)));
  };

  const handleAltBlur = async (imageId: number, locale: Locale) => {
    const value = images.find((img) => img.id === imageId)?.alt[locale] ?? "";
    try {
      const res = await fetch(`/api/portfolio/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: { [locale]: value } }),
      });
      if (!res.ok) feedback.toast({ tone: "error", message: "No se pudo guardar el texto alternativo." });
    } catch {
      feedback.toast({ tone: "error", message: "No se pudo guardar el texto alternativo. Revisa tu conexión." });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    const previous = images;
    setImages(next);
    try {
      const res = await fetch(`/api/portfolio/projects/${projectId}/images/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: next.map((img) => img.id) }),
      });
      if (!res.ok) throw new Error("reorder");
    } catch {
      setImages(previous);
      feedback.toast({ tone: "error", message: "No se pudo reordenar. Se restauró el orden anterior." });
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {canWrite && (
        <FileDropzone
          accept="image/png,image/jpeg,image/webp"
          maxBytes={15 * 1024 * 1024}
          label="Arrastra una captura o haz clic para elegirla"
          hint="PNG, JPG o WebP"
          busy={isUploading}
          onFile={handleUpload}
          onReject={setError}
        />
      )}

      {images.length === 0 ? (
        <p className="text-xs text-foreground/70">Sin imágenes todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((img, index) => (
            <div key={img.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 overflow-hidden">
              <div className="relative aspect-video bg-foreground/10">
                <Image src={img.variants.md} alt="" fill className="object-cover" />
                {coverImageId === img.id && (
                  <span className="absolute top-2 left-2 rounded-full bg-accent-strong px-2 py-0.5 text-[11px] font-bold text-white">Portada</span>
                )}
              </div>
              <div className="p-3 space-y-2">
                {LOCALES.map((l) => (
                  <input
                    key={l}
                    value={img.alt[l] ?? ""}
                    onChange={(e) => handleAltChange(img.id, l, e.target.value)}
                    onBlur={() => handleAltBlur(img.id, l)}
                    disabled={!canWrite}
                    placeholder={`Texto alternativo (${LOCALE_LABELS[l]})`}
                    aria-label={`Texto alternativo (${LOCALE_LABELS[l]}) de la imagen ${index + 1}`}
                    className="min-h-11 w-full rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                ))}
                {canWrite && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button onClick={() => handleSetCover(img.id)} disabled={coverImageId === img.id} className="flex-1 rounded-lg border border-foreground/15 px-2 py-1.5 text-[11px] font-semibold text-foreground/70 hover:bg-foreground/10 disabled:opacity-40">
                      Usar como portada
                    </button>
                    <button onClick={() => handleMove(index, -1)} disabled={index === 0} aria-label="Subir" className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-foreground/10 disabled:opacity-30">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => handleMove(index, 1)} disabled={index === images.length - 1} aria-label="Bajar" className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-foreground/10 disabled:opacity-30">
                      <ArrowDown size={12} />
                    </button>
                    <button onClick={() => handleDelete(img.id)} aria-label="Eliminar imagen" className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-danger/10 hover:text-danger">
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
      <p className="text-xs text-foreground/70">Resultados medibles del caso (ej. &quot;−60%&quot; / &quot;tiempo de despacho&quot;). Máximo 6.</p>
      {metrics.map((metric, index) => (
        <div key={index} className="rounded-lg border border-foreground/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={metric.value}
              onChange={(e) => update(index, "value", e.target.value)}
              disabled={!canWrite}
              placeholder="Valor (ej. −60%)"
              aria-label={`Valor de la métrica ${index + 1}`}
              className={`${inputClasses} font-mono w-32`}
            />
            {canWrite && (
              <button type="button" onClick={() => remove(index)} aria-label="Quitar métrica" className="flex h-11 w-11 items-center justify-center rounded text-foreground/70 hover:bg-danger/10 hover:text-danger">
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
                aria-label={`Etiqueta de la métrica ${index + 1} (${LOCALE_LABELS[l]})`}
                className="min-h-11 rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
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
