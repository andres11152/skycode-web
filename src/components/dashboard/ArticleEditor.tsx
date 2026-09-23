"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Sparkles, ExternalLink } from "lucide-react";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import type { Article, ArticleStatus } from "@/lib/queries/articles";
import type { BlogBlock } from "@/content/blogShared";
import { blogPostPath } from "@/lib/blogPaths";

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  published: "Publicado",
};

const STATUS_TONES: Record<ArticleStatus, BadgeTone> = {
  draft: "neutral",
  review: "warning",
  published: "success",
};

const inputClasses =
  "w-full rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const labelClasses = "block text-xs font-semibold text-foreground/70 mb-1.5";

function emptyBlock(): BlogBlock {
  return { type: "paragraph", text: "" };
}

function BlockRow({
  block,
  index,
  total,
  disabled,
  onChange,
  onRemove,
  onMove,
}: {
  block: BlogBlock;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (block: BlogBlock) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const changeType = (type: BlogBlock["type"]) => {
    if (type === "paragraph") onChange({ type: "paragraph", text: "" });
    else if (type === "heading") onChange({ type: "heading", level: 2, text: "" });
    else if (type === "list") onChange({ type: "list", items: [""] });
    else onChange({ type: "code", language: "ts", code: "" });
  };

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <select
          value={block.type}
          onChange={(e) => changeType(e.target.value as BlogBlock["type"])}
          disabled={disabled}
          className="rounded-lg border border-foreground/15 bg-foreground/[0.02] px-2 py-1 text-xs text-foreground outline-none focus:border-accent disabled:opacity-50"
        >
          <option value="paragraph">Párrafo</option>
          <option value="heading">Encabezado</option>
          <option value="list">Lista</option>
          <option value="code">Código</option>
        </select>
        {!disabled && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              aria-label="Mover arriba"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-foreground/10 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              aria-label="Mover abajo"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-foreground/10 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Eliminar bloque"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-red-500/10 hover:text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {block.type === "paragraph" && (
        <textarea
          value={block.text}
          onChange={(e) => onChange({ type: "paragraph", text: e.target.value })}
          disabled={disabled}
          rows={3}
          className={inputClasses}
          placeholder="Texto del párrafo…"
        />
      )}

      {block.type === "heading" && (
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
            disabled={disabled}
            className="rounded-lg border border-foreground/15 bg-foreground/[0.02] px-2 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            disabled={disabled}
            className={inputClasses}
            placeholder="Texto del encabezado…"
          />
        </div>
      )}

      {block.type === "list" && (
        <textarea
          value={block.items.join("\n")}
          onChange={(e) => onChange({ type: "list", items: e.target.value.split("\n") })}
          disabled={disabled}
          rows={4}
          className={inputClasses}
          placeholder={"Un ítem por línea…"}
        />
      )}

      {block.type === "code" && (
        <div className="space-y-2">
          <input
            type="text"
            value={block.language}
            onChange={(e) => onChange({ ...block, language: e.target.value })}
            disabled={disabled}
            className={inputClasses}
            placeholder="Lenguaje (ej. ts)"
          />
          <textarea
            value={block.code}
            onChange={(e) => onChange({ ...block, code: e.target.value })}
            disabled={disabled}
            rows={6}
            className={`${inputClasses} font-mono text-xs`}
            placeholder="Código…"
          />
        </div>
      )}
    </div>
  );
}

export function ArticleEditor({ article, canWrite }: { article: Article; canWrite: boolean }) {
  const router = useRouter();
  const [slug, setSlug] = useState(article.slug);
  const [title, setTitle] = useState(article.title);
  const [description, setDescription] = useState(article.description);
  const [author, setAuthor] = useState(article.author);
  const [authorSlug, setAuthorSlug] = useState(article.authorSlug);
  const [tagsInput, setTagsInput] = useState(article.tags.join(", "));
  const [blocks, setBlocks] = useState<BlogBlock[]>(article.content.length > 0 ? article.content : [emptyBlock()]);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editable = canWrite && (article.status === "draft" || article.status === "review");

  const updateBlock = (index: number, block: BlogBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  };
  const removeBlock = (index: number) => {
    setBlocks((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };
  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          description,
          author,
          authorSlug,
          tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
          content: blocks,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setSuccess("Guardado.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: "submit" | "publish" | "reject" | "unpublish" | "delete") => {
    if (action === "reject") {
      const reason = window.prompt("Motivo del rechazo (se lo verá el autor):");
      if (!reason) return;
      setActionLoading(action);
      setError(null);
      const res = await fetch(`/api/articles/${article.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setActionLoading(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo rechazar.");
        return;
      }
      router.refresh();
      return;
    }

    if (action === "delete") {
      if (!window.confirm(`¿Eliminar "${article.title || "este artículo"}"? Esta acción no se puede deshacer.`)) return;
      setActionLoading(action);
      const res = await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
      setActionLoading(null);
      if (res.ok) router.push("/dashboard/contenido");
      return;
    }

    setActionLoading(action);
    setError(null);
    const res = await fetch(`/api/articles/${article.id}/${action}`, { method: "POST" });
    setActionLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "La acción falló.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/contenido"
            className="inline-flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground outline-none rounded focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft size={14} /> Volver a Contenido
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {article.title || "Artículo sin título"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONES[article.status]}>{STATUS_LABELS[article.status]}</Badge>
            <Badge tone="neutral">{article.locale.toUpperCase()}</Badge>
            {article.targetKeyword && (
              <Badge tone="info">
                <Sparkles size={10} className="mr-1 inline" /> {article.targetKeyword}
              </Badge>
            )}
            {article.status === "published" && (
              <a
                href={blogPostPath(article.locale, article.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-strong hover:underline"
              >
                Ver en el sitio <ExternalLink size={11} />
              </a>
            )}
          </div>
          {article.rejectionReason && (
            <p className="mt-2 text-xs text-red-700">Motivo del último rechazo: {article.rejectionReason}</p>
          )}
        </div>

        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            )}
            {article.status === "draft" && (
              <Button variant="accent" onClick={() => runAction("submit")} disabled={actionLoading !== null}>
                Enviar a revisión
              </Button>
            )}
            {article.status === "review" && (
              <>
                <Button variant="secondary" onClick={() => runAction("reject")} disabled={actionLoading !== null}>
                  Rechazar
                </Button>
                <Button variant="accent" onClick={() => runAction("publish")} disabled={actionLoading !== null}>
                  Aprobar y publicar
                </Button>
              </>
            )}
            {article.status === "published" && (
              <Button variant="secondary" onClick={() => runAction("unpublish")} disabled={actionLoading !== null}>
                Despublicar
              </Button>
            )}
            <Button variant="ghost" onClick={() => runAction("delete")} disabled={actionLoading !== null} className="text-red-700 hover:bg-red-500/10">
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClasses}>Título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              disabled={!editable}
              className={inputClasses}
            />
          </div>
        </div>
        <div>
          <label className={labelClasses}>Descripción (meta SEO)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} rows={2} className={inputClasses} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClasses}>Autor</label>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} disabled={!editable} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Slug del autor (/equipo#slug)</label>
            <input type="text" value={authorSlug} onChange={(e) => setAuthorSlug(e.target.value)} disabled={!editable} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Tags (separados por coma)</label>
            <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={!editable} className={inputClasses} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Contenido</h2>
        {blocks.map((block, index) => (
          <BlockRow
            key={index}
            block={block}
            index={index}
            total={blocks.length}
            disabled={!editable}
            onChange={(b) => updateBlock(index, b)}
            onRemove={() => removeBlock(index)}
            onMove={(dir) => moveBlock(index, dir)}
          />
        ))}
        {editable && (
          <Button variant="secondary" onClick={() => setBlocks((prev) => [...prev, emptyBlock()])}>
            <Plus size={14} /> Agregar bloque
          </Button>
        )}
      </div>
    </div>
  );
}
