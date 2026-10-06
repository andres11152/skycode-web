/**
 * Defensas previas a decodificar una imagen subida con `sharp`.
 *
 * - `hasAllowedImageSignature`: mira los primeros bytes (JPEG/PNG/WebP) ANTES
 *   de pasar el buffer a `sharp`. Sin esto, `sharp(buffer).metadata()` ya
 *   invocaba a librsvg con un SVG hostil (CVE de librsvg) aunque después se
 *   rechazara el formato.
 * - `SHARP_INPUT_OPTIONS`: tope de píxeles de entrada. El valor por defecto de
 *   sharp (~268 MP) permite una "bomba de descompresión": un PNG de pocos KB
 *   que al decodificarse ocupa ~1 GB de RAM y tumba la instancia.
 */
export const SHARP_INPUT_OPTIONS = { limitInputPixels: 40_000_000 } as const;

export function hasAllowedImageSignature(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return isJpeg || isPng || isWebp;
}
