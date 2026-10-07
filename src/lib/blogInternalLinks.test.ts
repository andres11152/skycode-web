import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// Script de contenido en JS plano (corre fuera de Next): se importa su lógica pura, nunca su `main`.
import { internalHrefs, loadRules, pathFor, planPost } from "../../scripts/seo-blog-internal-links.mjs";
import type { BlogBlock } from "@/content/blogShared";
import { getRelatedServiceSlugsForPost } from "@/content/relatedContent";
import { SERVICE_PROJECT_SLUGS, services } from "@/content/services";
import { parseInlineLinks, stripInlineLinks } from "@/lib/inlineLinks";
import { blogPostPath } from "@/lib/blogPaths";
import { locales, type Locale } from "@/lib/i18n";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { estimatorPath } from "@/lib/estimatorMetadata";
import { servicePath } from "@/lib/serviceMetadata";

// Enlazado interno contextual del blog. Los posts viven en Postgres, así que
// aquí se aplica el MISMO planificador del script `db:seo-blog-links` sobre la
// copia archivada de los posts (scripts/seed-data/articles) y se comprueba lo
// que importa para SEO: ≥2 enlaces internos válidos por post en los 3
// idiomas, sin duplicados ni autoenlaces, con anchors descriptivos y solo
// hacia destinos que existen.

interface SeedPost {
  slug: string;
  content: BlogBlock[];
}
const seedRoot = path.resolve(__dirname, "../../scripts/seed-data");
const readJson = <T>(...parts: string[]): T => JSON.parse(readFileSync(path.join(seedRoot, ...parts), "utf-8")) as T;

const postsByLocale: Record<Locale, SeedPost[]> = {
  es: readJson<{ posts: SeedPost[] }>("articles", "es.json").posts,
  en: readJson<{ posts: SeedPost[] }>("articles", "en.json").posts,
  fr: readJson<{ posts: SeedPost[] }>("articles", "fr.json").posts,
};

const data = loadRules() as {
  minInternalLinks: number;
  posts: Record<string, { kind: "service" | "post" | "case" | "page"; slug: string; always: boolean }[]>;
};

// Este post no tiene reglas aquí: lo amplía `seo-legacy-migration-cluster.mjs`, que ya trae sus enlaces.
const LEGACY_CLUSTER_POST = "migracion-sistemas-legados-sin-interrupcion";

const GENERIC_ANCHORS = /^(aquí|aqui|click aquí|haz clic aquí|clic aquí|here|click here|read more|ver más|cliquez ici|ici|en savoir plus|lire la suite|este enlace|this link|ce lien)$/i;

const serviceSlugs = new Set(services.map((s) => s.slug));
const caseSlugs = new Set(Object.values(SERVICE_PROJECT_SLUGS).flat());
const allBlogSlugs = new Set(postsByLocale.es.map((p) => p.slug));

function linksOf(content: BlogBlock[]) {
  const links: { text: string; href: string }[] = [];
  for (const block of content) {
    const texts =
      block.type === "paragraph" ? [block.text] : block.type === "list" ? block.items : block.type === "faq" ? block.items.map((i) => i.answer) : [];
    for (const text of texts) {
      for (const seg of parseInlineLinks(text)) if (seg.type === "link") links.push({ text: seg.text, href: seg.href });
    }
  }
  return links;
}

interface Plan {
  content: BlogBlock[];
  applied: { href: string; anchor: string }[];
  skipped: { href: string; why: string }[];
  total: number;
}

function planFor(locale: Locale, post: SeedPost): Plan {
  return planPost({
    slug: post.slug,
    locale,
    content: post.content,
    rules: data.posts[post.slug] ?? [],
    minInternalLinks: data.minInternalLinks,
  });
}

describe("rutas del script", () => {
  it("pathFor coincide con las funciones de ruta reales del sitio", () => {
    for (const locale of locales) {
      expect(pathFor("service", locale, "apis-integraciones")).toBe(servicePath(locale, "apis-integraciones"));
      expect(pathFor("post", locale, "buenas-practicas-apis-rest")).toBe(blogPostPath(locale, "buenas-practicas-apis-rest"));
      expect(pathFor("case", locale, "sentry-crm")).toBe(portfolioCasePath(locale, "sentry-crm"));
      expect(pathFor("page", locale, "cotizador")).toBe(estimatorPath(locale));
      expect(pathFor("page", locale, "portafolio")).toBe(portfolioIndexPath(locale));
    }
  });
});

describe("reglas de enlazado interno", () => {
  it("todo destino existe y cada servicio enlazado es un servicio relacionado del post", () => {
    for (const [postSlug, rules] of Object.entries(data.posts)) {
      expect(allBlogSlugs.has(postSlug), `post desconocido ${postSlug}`).toBe(true);
      for (const rule of rules) {
        if (rule.kind === "service") {
          expect(serviceSlugs.has(rule.slug), `servicio inexistente ${rule.slug}`).toBe(true);
          expect(getRelatedServiceSlugsForPost(postSlug), `${postSlug} → ${rule.slug} no está en relatedContent`).toContain(rule.slug);
        } else if (rule.kind === "post") {
          expect(allBlogSlugs.has(rule.slug), `post inexistente ${rule.slug}`).toBe(true);
          expect(rule.slug).not.toBe(postSlug);
        } else if (rule.kind === "page") {
          expect(["cotizador", "portafolio"], `página desconocida ${rule.slug}`).toContain(rule.slug);
        } else {
          expect(caseSlugs.has(rule.slug), `caso inexistente ${rule.slug}`).toBe(true);
        }
      }
    }
  });

  it("cada regla trae texto en los tres idiomas", () => {
    for (const rules of Object.values(data.posts)) {
      for (const rule of rules) for (const locale of locales) expect(rule[locale as keyof typeof rule], `${rule.slug}/${locale}`).toBeTruthy();
    }
  });
});

describe.each(locales)("posts del blog (%s) tras aplicar el script", (locale) => {
  const posts = postsByLocale[locale].filter((p) => p.slug !== LEGACY_CLUSTER_POST);

  it("cubre los 5 posts con reglas y deja el sexto al script del cluster legacy", () => {
    expect(posts.length).toBeGreaterThanOrEqual(5);
    for (const post of postsByLocale[locale]) {
      expect(post.slug === LEGACY_CLUSTER_POST || data.posts[post.slug], `${post.slug} sin reglas`).toBeTruthy();
    }
  });

  it("cada post termina con al menos 2 enlaces internos distintos y válidos", () => {
    for (const post of posts) {
      const { content } = planFor(locale, post);
      const links = linksOf(content);
      const hrefs = new Set(links.map((l) => l.href));
      expect(hrefs.size, `${locale}/${post.slug}`).toBeGreaterThanOrEqual(2);
      expect(internalHrefs(content).size).toBe(hrefs.size);

      const prefix = locale === "es" ? "" : `/${locale}`;
      for (const { href, text } of links) {
        expect(href.startsWith("/") && !href.startsWith("//"), href).toBe(true);
        expect(text.trim().length, `anchor vacío en ${href}`).toBeGreaterThan(2);
        expect(GENERIC_ANCHORS.test(text.trim()), `anchor genérico "${text}"`).toBe(false);
        if (href.includes("/servicios/")) {
          expect(href.startsWith(`${prefix}/servicios/`), `prefijo de idioma en ${href}`).toBe(true);
          expect(serviceSlugs.has(href.split("/servicios/")[1])).toBe(true);
        } else if (href.includes("/blog/")) {
          expect(href.startsWith(`${prefix}/blog/`), `prefijo de idioma en ${href}`).toBe(true);
          expect(allBlogSlugs.has(href.split("/blog/")[1])).toBe(true);
          expect(href, "autoenlace").not.toBe(blogPostPath(locale, post.slug));
        }
      }
    }
  });

  it("no repite un mismo destino ni deja frases rotas (el texto visible conserva el anchor)", () => {
    for (const post of posts) {
      const { content, applied } = planFor(locale, post);
      const hrefs = linksOf(content).map((l) => l.href);
      expect(new Set(hrefs).size, `destino repetido en ${locale}/${post.slug}`).toBe(hrefs.length);
      const visible = content.map((b) => (b.type === "paragraph" ? stripInlineLinks(b.text) : b.type === "list" ? b.items.map(stripInlineLinks).join(" ") : "")).join("\n");
      for (const link of applied) expect(visible).toContain(link.anchor);
      expect(visible).not.toMatch(/\{link\}|\]\(|\[\w/);
    }
  });

  it("es idempotente: aplicarlo dos veces no cambia nada", () => {
    for (const post of posts) {
      const first = planFor(locale, post);
      const second = planFor(locale, { slug: post.slug, content: first.content });
      expect(second.applied).toEqual([]);
      expect(second.content).toEqual(first.content);
    }
  });

  it("no toca el original (trabaja sobre una copia)", () => {
    const post = posts[0];
    const before = JSON.stringify(post.content);
    planFor(locale, post);
    expect(JSON.stringify(post.content)).toBe(before);
  });

  it("el post de outsourcing recibe enlaces entrantes desde al menos 2 posts distintos", () => {
    const target = "outsourcing-software-latam-propiedad-codigo";
    const sources = posts.filter((p) => p.slug !== target).filter((p) => internalHrefs(planFor(locale, p).content).has(blogPostPath(locale, target)));
    expect(sources.length).toBeGreaterThanOrEqual(2);
  });
});

describe("planificador", () => {
  const content: BlogBlock[] = [
    { type: "paragraph", text: "Primero un [enlace ya existente](/servicios/apis-integraciones) y luego la frase objetivo del texto." },
    { type: "list", items: ["otro punto con la frase objetivo", "último punto."] },
  ];
  const rule = { kind: "service", slug: "seguridad-cumplimiento", always: true, es: { wrap: "frase objetivo" } };

  it("envuelve la primera aparición de la frase y deja el resto del texto igual", () => {
    const plan = planPost({ slug: "x", locale: "es", content, rules: [rule], minInternalLinks: 2 });
    expect((plan.content[0] as { text: string }).text).toContain("[frase objetivo](/servicios/seguridad-cumplimiento)");
    expect((plan.content[1] as { items: string[] }).items[0]).toBe("otro punto con la frase objetivo");
    expect(plan.total).toBe(2);
  });

  it("las reglas sin `always` no se aplican si el post ya llega al mínimo", () => {
    const plan = planPost({ slug: "x", locale: "es", content, rules: [{ ...rule, always: false }], minInternalLinks: 1 });
    expect(plan.applied).toEqual([]);
    expect(plan.skipped[0].why).toMatch(/ya tiene/);
  });

  it("no envuelve una frase que ya está dentro de un enlace y falla si no hay dónde", () => {
    const only: BlogBlock[] = [{ type: "paragraph", text: "Mira la [frase objetivo](/servicios/apis-integraciones) completa." }];
    expect(() => planPost({ slug: "x", locale: "es", content: only, rules: [rule], minInternalLinks: 1 })).toThrow(/no se encontró la frase/);
  });

  it("falla si un post con reglas no llega al mínimo", () => {
    const bare: BlogBlock[] = [{ type: "paragraph", text: "Sin enlaces y sin la frase." }];
    expect(() => planPost({ slug: "x", locale: "es", content: bare, rules: [], minInternalLinks: 2 })).toThrow(/mínimo 2/);
  });
});

describe("post del cluster legacy", () => {
  it("el contenido que agrega seo-legacy-migration-cluster ya trae al menos 2 destinos internos distintos por idioma", () => {
    const cluster = readJson<Record<Locale, Record<string, unknown>>>("seo", "legacy-migration-cluster.json");
    for (const locale of locales) {
      const blocks = JSON.stringify(cluster[locale]).match(/\]\((\/[^)\s]*)\)/g) ?? [];
      expect(new Set(blocks).size).toBeGreaterThanOrEqual(2);
    }
  });
});
