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
// También admite código en línea con comillas invertidas (`código`): los
// posts técnicos lo usan para nombres de cabeceras, comandos o campos, y sin
// esto el visitante veía las comillas literales.
//
// Módulo puro (sin React ni `pg`): lo usan el render (InlineText), el RSS,
// el conteo de palabras y el JSON-LD de FAQ.

export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "code"; text: string };

// Una sola pasada con dos alternativas: `código` o [texto](/ruta). Así un enlace dentro de un
// fragmento de código (o al revés) nunca se interpreta dos veces.
const INLINE_PATTERN = /`([^`\n]+)`|\[([^\]\n]+)\]\((\/[^)\s]*)\)/g;

function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Parte un texto en segmentos de texto plano, enlace interno y código en línea. */
export function parseInlineLinks(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const [whole, code, label, href] = match;
    if (code === undefined && !isInternalHref(href)) continue;
    const start = match.index ?? 0;
    if (start > lastIndex) segments.push({ type: "text", text: text.slice(lastIndex, start) });
    segments.push(code !== undefined ? { type: "code", text: code } : { type: "link", text: label, href });
    lastIndex = start + whole.length;
  }

  if (lastIndex < text.length) segments.push({ type: "text", text: text.slice(lastIndex) });
  return segments;
}

/** El mismo texto sin la sintaxis de enlace ni de código (solo el texto visible) — para RSS, JSON-LD y conteo de palabras. */
export function stripInlineLinks(text: string): string {
  return parseInlineLinks(text)
    .map((segment) => segment.text)
    .join("");
}
