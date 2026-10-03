// Enlaces internos dentro del texto plano de un bloque del blog o del copy
// de un servicio, con la sintaxis `[texto del enlace](/ruta)`.
//
// Los bloques (`BlogBlock` en content/blogShared.ts) son texto plano a
// propósito — sin MDX ni HTML, ver CLAUDE.md — así que no había forma de
// enlazar contextualmente un post a la página de servicio que lo respalda
// (el enlazado interno es lo que le dice a Google qué página es la
// autoridad de un tema). Esta es la extensión mínima: solo rutas internas
// (empiezan con "/" pero no con "//"); cualquier otra cosa entre corchetes
// queda como texto literal, así que un borrador generado por IA no puede
// colar un enlace externo.
//
// Módulo puro (sin React ni `pg`): lo usan el render (InlineText), el RSS,
// el conteo de palabras y el JSON-LD de FAQ.

export type InlineSegment = { type: "text"; text: string } | { type: "link"; text: string; href: string };

const LINK_PATTERN = /\[([^\]\n]+)\]\((\/[^)\s]*)\)/g;

function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Parte un texto en segmentos de texto plano y de enlace interno. */
export function parseInlineLinks(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const [whole, label, href] = match;
    if (!isInternalHref(href)) continue;
    const start = match.index ?? 0;
    if (start > lastIndex) segments.push({ type: "text", text: text.slice(lastIndex, start) });
    segments.push({ type: "link", text: label, href });
    lastIndex = start + whole.length;
  }

  if (lastIndex < text.length) segments.push({ type: "text", text: text.slice(lastIndex) });
  return segments;
}

/** El mismo texto sin la sintaxis de enlace (solo el texto visible) — para RSS, JSON-LD y conteo de palabras. */
export function stripInlineLinks(text: string): string {
  return parseInlineLinks(text)
    .map((segment) => segment.text)
    .join("");
}
