/**
 * Loader de `next/image` (`images.loaderFile` en next.config.ts): reemplaza al optimizador `/_next/image`.
 *
 * Por qué: el optimizador codifica con sharp (libvips) EN EL SERVIDOR. En Linux con glibc, que es lo que corre
 * Render, la memoria nativa de libvips se fragmenta y no se devuelve al sistema (lo advierte la propia guía de
 * self-hosting de Next). En la instancia de 512 MB eso se veía como una curva de memoria que subía escalonada con
 * cada ráfaga de imágenes hasta el OOM y el reinicio (502 intermitentes, 2026-11-20 al 23). No hacía falta:
 * las imágenes del portafolio y los avatares YA se suben en variantes WebP al bucket (`-sm|-md|-lg[-xl].webp`,
 * ver `portfolioStorage.ts` y `avatarStorage.ts`), así que basta con elegir la variante adecuada al ancho pedido
 * y que el navegador la pida directo al bucket (la CSP ya permite `https://*.r2.dev`).
 *
 * Todo lo demás (logos de `public/`, ya al tamaño real de uso) se sirve tal cual. No importes nada del proyecto
 * aquí: lo carga también el navegador.
 */

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

type Variant = "sm" | "md" | "lg" | "xl";

/** Ancho nominal de cada variante. Los avatares son cuadrados y más chicos; se distinguen por la ruta. */
const PORTFOLIO_WIDTHS: Record<Exclude<Variant, "xl">, number> = { sm: 400, md: 800, lg: 1600 };
const AVATAR_WIDTHS: Record<Exclude<Variant, "xl">, number> = { sm: 64, md: 128, lg: 256 };

const VARIANT_URL = /^(https?:\/\/.+)-(sm|md|lg|xl)\.webp$/;

function pickVariant(requestedWidth: number, widths: Record<Exclude<Variant, "xl">, number>, current: Variant): Variant {
  const ordered: Array<Exclude<Variant, "xl">> = ["sm", "md", "lg"];
  for (const variant of ordered) {
    if (widths[variant] >= requestedWidth) return variant;
  }
  // Más grande que `lg`: la `xl` solo existe si quien llama ya pidió esa (no se genera siempre, ver portfolioStorage).
  return current === "xl" ? "xl" : "lg";
}

export default function imageLoader({ src, width }: LoaderArgs): string {
  const match = VARIANT_URL.exec(src);
  if (match) {
    const [, base, current] = match;
    const widths = base.includes("/avatars/") ? AVATAR_WIDTHS : PORTFOLIO_WIDTHS;
    return `${base}-${pickVariant(width, widths, current as Variant)}.webp`;
  }
  // Archivos locales de `public/`: sin transformación. `?w=` solo evita el aviso de "loader sin width" y no cambia el archivo.
  return src.includes("?") ? src : `${src}?w=${width}`;
}
