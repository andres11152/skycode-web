/**
 * Decide si un clic debe abrir el modal de contacto en vez de navegar.
 *
 * Puro (sin DOM) para poder probarlo. La regla es deliberadamente estrecha:
 * solo enlaces que apuntan al ancla `#contacto` (de la página actual o de la
 * home de cualquier idioma), y nunca cuando la persona intenta abrir el
 * enlace en otra pestaña o ventana.
 */
const CONTACT_ANCHOR = /^(?:\/(?:en|fr))?\/?#contacto$/;

export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

export function isContactHref(href: string | null): boolean {
  return href !== null && CONTACT_ANCHOR.test(href.trim());
}

export function shouldOpenContactModal(
  event: ClickLike,
  anchor: { getAttribute(name: string): string | null },
): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  if (anchor.getAttribute("download") !== null) return false;
  return isContactHref(anchor.getAttribute("href"));
}
