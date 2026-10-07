import { Buildings, Car, FlowArrow, Globe, Graph, House, Rocket, ShieldCheck, ShoppingCart, Truck } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Locale } from "@/lib/i18n";
import { textOrNull, withoutTodos } from "@/lib/todoPlaceholders";

// Tipos + funciones puras del portafolio (sin ningún import de lib/db.ts
// ni de lib/queries/portfolio.ts) — mismo criterio de separación que
// content/blogShared.ts vs. content/blog.ts: un componente cliente
// (Portfolio.tsx, PortfolioIndexView, ProjectView) necesita estos tipos y
// el mapa de íconos sin arrastrar `pg` a su bundle del navegador.

export const PORTFOLIO_ICON_MAP: Record<string, Icon> = {
  Graph,
  Buildings,
  ShoppingCart,
  Rocket,
  Globe,
  FlowArrow,
  Truck,
  Car,
  ShieldCheck,
  House,
};

/** Catálogo cerrado — el admin del panel solo puede elegir de esta lista, ver PortfolioForm.tsx. */
export const PORTFOLIO_ICON_NAMES = Object.keys(PORTFOLIO_ICON_MAP) as (keyof typeof PORTFOLIO_ICON_MAP)[];

export type PortfolioStatus = "draft" | "published" | "archived";

export type PortfolioTechCategory = "frontend" | "backend" | "database" | "infra" | "mobile" | "ai" | "integration" | "other";

export const PORTFOLIO_TECH_CATEGORIES: PortfolioTechCategory[] = [
  "frontend",
  "backend",
  "database",
  "infra",
  "mobile",
  "ai",
  "integration",
  "other",
];

export interface PortfolioImageVariants {
  sm: string;
  md: string;
  lg: string;
  /** Solo si la fuente era más ancha que `lg` (ver portfolioStorage.ts): el zoom del visor cae a `lg` sin ella. */
  xl?: string;
}

/**
 * Lo que se guarda en la columna JSONB `variants`: las URLs más el marcador de
 * posición. Van juntos a propósito (sin migración): son datos de la misma
 * subida y siempre se leen con la fila.
 */
export interface StoredImageVariants extends PortfolioImageVariants {
  blur?: string;
  color?: string;
}

export interface PortfolioImage {
  id: number;
  variants: PortfolioImageVariants;
  width: number;
  height: number;
  /** Ya resuelto al locale pedido (con fallback a español), no el JSONB crudo — ver `resolveLocalizedText()`. */
  alt: string;
  /** Difuminado de ~16px para `placeholder="blur"`; `null` en imágenes anteriores al relleno (ver db:portfolio-image-placeholders). */
  blurDataURL: string | null;
  /** Color medio (`#rrggbb`); `null` igual que `blurDataURL`. */
  color: string | null;
}

export interface PortfolioTechnology {
  id: number;
  slug: string;
  name: string;
  category: PortfolioTechCategory;
  iconSource: "simple-icons" | "custom";
  /** `simple-icons`: el slug del paquete (ver lib/simpleIcons.ts). `custom`: la URL pública del SVG subido al bucket del portafolio. */
  iconRef: string;
  websiteUrl: string | null;
  /**
   * Ya resuelto server-side (ver `lib/simpleIcons.ts` y
   * `shapeTechnology()` en lib/queries/portfolio.ts) — nunca se resuelve
   * en el cliente, así el paquete `simple-icons` (27MB con +3400 íconos)
   * jamás llega al bundle del navegador. `null` cuando `iconSource` es
   * `custom` (ahí `iconRef` ya es una URL de imagen lista para usar) o
   * cuando el slug no matchea ningún ícono del paquete instalado.
   */
  icon: { title: string; hex: string; viewBox: string; pathD: string } | null;
}

export interface PortfolioMetric {
  value: string;
  /** Ya resuelto al locale pedido (con fallback a español). */
  label: string;
}

export interface PortfolioProject {
  slug: string;
  status: PortfolioStatus;
  isFeatured: boolean;
  liveUrl: string | null;
  industryIcon: string;
  title: string;
  clientLabel: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string;
  /**
   * Capítulos del caso completo (migración 0041). Texto por idioma con el
   * formato de `parseCaseText()`; `""` cuando no hay nada cargado (la vista
   * oculta el capítulo entero). Pueden contener marcadores `{{TODO: …}}`:
   * la vista pública los omite en producción, ver `lib/todoPlaceholders.ts`.
   */
  clientContext: string;
  architecture: string;
  process: string;
  /** Testimonio en tres campos separados: cada uno se omite por su lado si falta o trae un marcador. */
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialRole: string;
  capabilities: string[];
  technologies: PortfolioTechnology[];
  images: PortfolioImage[];
  coverImage: PortfolioImage | null;
  metrics: PortfolioMetric[];
  publishedAt: string | null;
  /**
   * `false` cuando el texto salió del respaldo en español porque este caso no
   * tiene traducción real al idioma pedido (siempre `true` en español). Las
   * superficies lo usan para marcar el contenido con `EsBadge` y excluirlo de
   * índices/sitemap en `/en` y `/fr`, en vez de servir español bajo una URL
   * en otro idioma sin avisar.
   */
  translated: boolean;
}

/**
 * Resuelve un campo JSONB por idioma (`alt`, `label`) al locale pedido,
 * cayendo a español si falta la traducción — mismo criterio de "ES con
 * EsBadge" que ya usa el resto del sitio para contenido no traducido
 * todavía (ver "Internacionalización" en CLAUDE.md), aplicado acá a nivel
 * de campo individual en vez de documento completo.
 */
export function resolveLocalizedText(value: unknown, locale: Locale): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, string>;
  return record[locale] || record.es || "";
}

/** Host que se muestra en la barra del marco de navegador: el real si hay `liveUrl`, o uno de marca si no. */
export function getProjectHostname(project: Pick<PortfolioProject, "slug" | "liveUrl">): string {
  const fallback = `skycode.agency/cases/${project.slug}`;
  if (!project.liveUrl) return fallback;
  try {
    return new URL(project.liveUrl).hostname;
  } catch {
    return fallback;
  }
}

export function getPortfolioIcon(name: string): Icon {
  return PORTFOLIO_ICON_MAP[name] ?? Buildings;
}

export type CaseTextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

/**
 * Convierte el texto de un capítulo del caso (campo de una sola caja en el
 * panel) en bloques: párrafos separados por una línea en blanco y listas
 * donde TODAS las líneas del bloque empiezan con `- `. Cada bloque (y cada
 * viñeta) es un elemento independiente a propósito: la vista pública omite
 * por separado los que contienen un marcador `{{TODO: …}}`, así que un dato
 * pendiente nunca arrastra a los párrafos reales que lo rodean. Puro: lo
 * usan la vista cliente, el editor y las pruebas.
 */
export function parseCaseText(text: string | null | undefined): CaseTextBlock[] {
  if (!text) return [];
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block): CaseTextBlock => {
      const lines = block.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
        return { type: "list", items: lines.map((line) => line.slice(2).trim()).filter((item) => item.length > 0) };
      }
      return { type: "paragraph", text: lines.join(" ") };
    });
}

/** Palabras del texto de un capítulo sin marcadores `{{TODO}}` (lo que realmente ve el visitante). */
export function countCaseWords(text: string | null | undefined): number {
  return parseCaseText(text)
    .flatMap((block) => (block.type === "list" ? block.items : [block.text]))
    .filter((chunk) => !chunk.includes("{{TODO"))
    .reduce((total, chunk) => total + chunk.split(/\s+/).filter(Boolean).length, 0);
}

/**
 * Bloques de un capítulo tal como los ve el visitante: sin los párrafos ni
 * viñetas que contienen un marcador `{{TODO: …}}` (en desarrollo se muestran
 * para poder revisarlos). Una lista cuyas viñetas se omiten todas desaparece.
 */
/** El mismo texto de capítulo sin los párrafos/viñetas con marcador `{{TODO}}` (en producción), listo para volver a `parseCaseText`. */
export function stripCaseTodos(text: string | null | undefined): string {
  return visibleCaseBlocks(text)
    .map((block) => (block.type === "list" ? block.items.map((item) => `- ${item}`).join("\n") : block.text))
    .join("\n\n");
}

/**
 * Caso listo para la página pública: sin ningún marcador `{{TODO}}`. La vista
 * ya los oculta al pintar, pero `ProjectView` es un componente cliente y sus
 * props viajan en la carga RSC del HTML — sin esta limpieza el marcador
 * quedaba visible en el código fuente de la página aunque no se viera.
 */
export function toPublicProject(project: PortfolioProject): PortfolioProject {
  return {
    ...project,
    challenge: stripCaseTodos(project.challenge),
    solution: stripCaseTodos(project.solution),
    results: stripCaseTodos(project.results),
    clientContext: stripCaseTodos(project.clientContext),
    architecture: stripCaseTodos(project.architecture),
    process: stripCaseTodos(project.process),
    testimonialQuote: textOrNull(project.testimonialQuote) ?? "",
    testimonialAuthor: textOrNull(project.testimonialAuthor) ?? "",
    testimonialRole: textOrNull(project.testimonialRole) ?? "",
    metrics: withoutTodos(project.metrics),
  };
}

export function visibleCaseBlocks(text: string | null | undefined): CaseTextBlock[] {
  const blocks = parseCaseText(text).map((block): CaseTextBlock =>
    block.type === "list" ? { type: "list", items: withoutTodos(block.items) } : block
  );
  return withoutTodos(blocks.filter((block) => !(block.type === "list" && block.items.length === 0)));
}

/** Enlaces internos del caso, ya resueltos en el servidor (ver PortfolioCasePage). */
export interface CaseRelatedLinks {
  services: { slug: string; title: string; href: string }[];
  posts: { slug: string; title: string; href: string }[];
}

/** Máximo de capturas que el índice lleva por caso (el resto se pide al abrir el visor). */
export const INDEX_PREVIEW_LIMIT = 8;

/**
 * Lo que el índice `/portafolio` necesita de cada caso. `PortfolioIndexView` es
 * un componente cliente: todo lo que reciba por prop viaja en la carga RSC del
 * HTML. Con `PortfolioProject` completo eso eran los capítulos de texto largo
 * y las 19 capturas de un solo caso; acá solo va el resumen y unas pocas
 * capturas.
 */
export interface PortfolioIndexItem {
  slug: string;
  isFeatured: boolean;
  liveUrl: string | null;
  industryIcon: string;
  title: string;
  clientLabel: string;
  summary: string;
  capabilities: string[];
  coverImage: PortfolioImage | null;
  /** Portada primero y luego las demás, hasta `INDEX_PREVIEW_LIMIT`. */
  previewImages: PortfolioImage[];
  /** Total real de capturas del caso (puede ser mayor que `previewImages.length`). */
  imageCount: number;
}

export function toIndexItem(project: PortfolioProject): PortfolioIndexItem {
  const cover = project.coverImage;
  const ordered = cover ? [cover, ...project.images.filter((image) => image.id !== cover.id)] : project.images;
  return {
    slug: project.slug,
    isFeatured: project.isFeatured,
    liveUrl: project.liveUrl,
    industryIcon: project.industryIcon,
    title: project.title,
    clientLabel: project.clientLabel,
    summary: project.summary,
    capabilities: project.capabilities,
    coverImage: cover,
    previewImages: ordered.slice(0, INDEX_PREVIEW_LIMIT),
    imageCount: project.images.length,
  };
}

/** Tecnologías únicas de todos los casos, las más repetidas primero (datos reales, nada inventado). */
export function topTechnologies(projects: Pick<PortfolioProject, "technologies">[], limit: number): PortfolioTechnology[] {
  const counts = new Map<number, { technology: PortfolioTechnology; count: number }>();
  for (const project of projects) {
    for (const technology of project.technologies) {
      const entry = counts.get(technology.id);
      if (entry) entry.count += 1;
      else counts.set(technology.id, { technology, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.technology);
}
