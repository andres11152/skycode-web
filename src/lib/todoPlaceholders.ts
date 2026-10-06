// Marcadores `{{TODO: dato real}}` del plan de SEO: datos de negocio que el
// código NO puede inventar (precios, métricas de clientes, testimonios, URLs
// de perfiles). Viven dentro del contenido para que quien los completa sepa
// exactamente dónde van, pero NUNCA deben llegar a una página pública:
//
//   - En producción el contenido que contiene un marcador se OMITE (el
//     párrafo, viñeta, pregunta, métrica o bloque entero) — por eso cada
//     marcador debe ocupar su propio elemento, nunca ir en mitad de una frase
//     que sí debe publicarse.
//   - En desarrollo (o con NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS=true) se muestra
//     tal cual, para revisarlo en pantalla.
//   - `npm run seo:check` falla si un marcador llega al HTML servido.
//   - `npm run seo:todos` lista todos los pendientes del repo.
//
// Sin imports del proyecto: lo usan componentes de servidor, scripts y tests.

export const TODO_MARKER = "{{TODO";

export function showTodoPlaceholders(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS === "true";
}

/** `true` si el valor (cadena, arreglo u objeto, a cualquier profundidad) contiene un marcador. */
export function hasTodo(value: unknown): boolean {
  if (typeof value === "string") return value.includes(TODO_MARKER);
  if (Array.isArray(value)) return value.some(hasTodo);
  if (value && typeof value === "object") return Object.values(value).some(hasTodo);
  return false;
}

/** Quita los elementos con marcador salvo que se esté en modo de revisión. */
export function withoutTodos<T>(items: readonly T[]): T[] {
  return showTodoPlaceholders() ? [...items] : items.filter((item) => !hasTodo(item));
}

/** El texto tal cual, o `null` si contiene un marcador y no se está en modo de revisión. */
export function textOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return !showTodoPlaceholders() && hasTodo(value) ? null : value;
}
