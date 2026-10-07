import { getImageProps } from "next/image";

const requested = new Set<string>();

/**
 * Calienta en el caché del navegador la imagen que `<Image src sizes fill>`
 * pediría, con LA MISMA URL optimizada (`/_next/image?url=…&w=…`). Precargar
 * el `src` crudo del bucket no serviría: el navegador pide la URL del
 * optimizador, que es otra. Sirve para precargar por intención (hover) o la
 * imagen contigua de un visor. Solo cliente; sin efecto en el servidor.
 */
export function preloadNextImage(src: string, sizes: string): void {
  if (typeof window === "undefined" || !src) return;
  const { props } = getImageProps({ src, alt: "", sizes, fill: true });
  const key = `${props.src}|${sizes}`;
  if (requested.has(key)) return;
  requested.add(key);
  const image = new window.Image();
  image.decoding = "async";
  image.sizes = sizes;
  if (props.srcSet) image.srcset = props.srcSet;
  image.src = String(props.src);
}
