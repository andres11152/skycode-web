// Recortes de texto para metadata de buscadores. Sin imports del proyecto.

/** Recorta en el último límite de palabra para no pasar de `max` caracteres, agregando "…" si cortó. */
export function truncateAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—·]+$/, "")}…`;
}

/**
 * Título de página para el `<title>` (el layout agrega el sufijo de marca):
 * el título completo si cabe en `max`; si no, la marca (lo que va antes de
 * " · ") más una etiqueta corta; y como último recurso, un recorte de palabra.
 */
export function fitTitle(title: string, max: number, fallbackLabel?: string): string {
  if (title.length <= max) return title;
  const brand = title.split(" · ")[0]?.trim();
  if (brand && fallbackLabel) {
    const candidate = `${brand} · ${fallbackLabel}`;
    if (candidate.length <= max) return candidate;
  }
  return truncateAtWord(brand && brand.length > 8 ? brand : title, max);
}
