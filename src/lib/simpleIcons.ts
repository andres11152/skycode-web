import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Resolver server-only de íconos de marca para el catálogo de tecnologías
 * del portafolio (ver migración 0034, `portfolio_technologies.icon_ref`).
 *
 * `simple-icons` (CC0, +3400 marcas: Next.js, PostgreSQL, WordPress...) no
 * se importa como módulo — su índice JS (`simple-icons`/`simple-icons/icons`)
 * pesa ~27MB con TODOS los íconos, y como el slug a mostrar viene de la
 * base de datos en tiempo de ejecución (no se sabe en build time cuáles se
 * van a usar), un bundler no puede hacer tree-shaking de un lookup dinámico
 * por string — se importaría el paquete completo igual. En cambio, se lee
 * el `.svg` individual de cada ícono directo del paquete instalado
 * (`node_modules/simple-icons/icons/<slug>.svg`, un archivo por marca) con
 * `readFileSync` — mismo criterio que `geoip-country` en `app/api/geo`
 * (ver `serverExternalPackages` en next.config.ts): nunca se importa desde
 * un componente cliente, solo se resuelve server-side y lo único que llega
 * al navegador es el `path`/`viewBox` ya extraído (unas pocas decenas de
 * bytes), no el paquete.
 */

// `require.resolve("simple-icons/...")` no sirve acá — bajo Turbopack,
// `require` dentro de un módulo bundleado es su propio shim de resolución
// de módulos internos, no el `require` real de Node: `.resolve()` devuelve
// un ID de chunk (un número), no una ruta de archivo, y truena al primer
// `path.join()`. `process.cwd()` es el mismo patrón que ya usa
// `lib/invoicePdf.ts` para leer `public/logo-full.png` en runtime — el
// directorio de trabajo del proceso de Next.js en producción SÍ es la raíz
// de la app (donde vive `node_modules`), sin ambigüedad de bundler.
const PACKAGE_ROOT = path.join(process.cwd(), "node_modules", "simple-icons");
const ICONS_DIR = path.join(PACKAGE_ROOT, "icons");
const METADATA_PATH = path.join(PACKAGE_ROOT, "data", "simple-icons.json");

interface SimpleIconMetaEntry {
  title: string;
  slug: string;
  hex: string;
}

let metaBySlug: Map<string, SimpleIconMetaEntry> | null = null;

/** `data/simple-icons.json` trae título/slug/hex de las +3400 marcas (sin el SVG) — se carga una sola vez por proceso. */
function loadMetaMap(): Map<string, SimpleIconMetaEntry> {
  if (metaBySlug) return metaBySlug;
  const raw = readFileSync(METADATA_PATH, "utf-8");
  const list = JSON.parse(raw) as SimpleIconMetaEntry[];
  metaBySlug = new Map(list.map((entry) => [entry.slug, entry]));
  return metaBySlug;
}

export interface ResolvedSimpleIcon {
  title: string;
  hex: string;
  viewBox: string;
  pathD: string;
}

const svgCache = new Map<string, ResolvedSimpleIcon | null>();

/**
 * Resuelve un ícono por su slug (ej. `"nextdotjs"`, `"postgresql"`) — el
 * mismo slug que muestra simpleicons.org en la URL de cada marca. `null`
 * si el slug no existe en el paquete instalado (una tecnología del
 * catálogo con un `icon_ref` que ya no matchea ninguna versión de
 * simple-icons, por ejemplo tras actualizar el paquete) — el caller
 * decide qué hacer (no renderizar el ícono, mostrar un placeholder), esta
 * función nunca lanza por un slug faltante.
 */
export function getSimpleIcon(slug: string): ResolvedSimpleIcon | null {
  if (svgCache.has(slug)) return svgCache.get(slug) ?? null;

  // El slug viene de `portfolio_technologies.icon_ref` (siempre a través
  // del catálogo admin, nunca de un formulario público) pero se sanea
  // igual antes de tocar el filesystem — solo minúsculas/dígitos, ningún
  // separador de ruta (`/`, `..`) puede llegar a `readFileSync`.
  if (!/^[a-z0-9]+$/.test(slug)) {
    svgCache.set(slug, null);
    return null;
  }

  try {
    const svgRaw = readFileSync(path.join(ICONS_DIR, `${slug}.svg`), "utf-8");
    const viewBoxMatch = svgRaw.match(/viewBox="([^"]+)"/);
    const pathMatch = svgRaw.match(/<path d="([^"]+)"/);
    const meta = loadMetaMap().get(slug);

    if (!viewBoxMatch || !pathMatch || !meta) {
      svgCache.set(slug, null);
      return null;
    }

    const resolved: ResolvedSimpleIcon = { title: meta.title, hex: meta.hex, viewBox: viewBoxMatch[1], pathD: pathMatch[1] };
    svgCache.set(slug, resolved);
    return resolved;
  } catch {
    svgCache.set(slug, null);
    return null;
  }
}

export interface SimpleIconSearchResult {
  slug: string;
  title: string;
}

/**
 * Buscador para el selector del catálogo admin (`/dashboard/portafolio/tecnologias`,
 * fase siguiente) — recorre solo los metadatos livianos (título/slug), sin
 * leer ningún `.svg` todavía; el ícono se resuelve recién cuando se elige
 * un resultado concreto.
 */
export function searchSimpleIcons(query: string, limit = 20): SimpleIconSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SimpleIconSearchResult[] = [];
  for (const meta of loadMetaMap().values()) {
    if (meta.slug.includes(q) || meta.title.toLowerCase().includes(q)) {
      results.push({ slug: meta.slug, title: meta.title });
      if (results.length >= limit) break;
    }
  }
  return results;
}
