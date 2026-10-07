import { isContactHref, type ClickLike } from "@/lib/contactModalTrigger";

/**
 * Decide si un clic en un enlace va a producir una navegación entre páginas
 * (y por tanto debe encender la barra de progreso global). Puro, sin DOM, para
 * poder probarlo: misma estructura que `contactModalTrigger`.
 *
 * Queda fuera todo lo que NO cambia de página: otro origen, nueva pestaña,
 * descargas, clic con modificador, navegación solo de ancla o de query, y el
 * enlace al formulario de contacto (abre un modal, no navega). Si la barra se
 * encendiera ahí, se quedaría esperando un cambio de ruta que nunca llega.
 */
export function shouldTrackNavigation(
  event: ClickLike,
  anchor: { getAttribute(name: string): string | null },
  currentUrl: URL,
): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  if (anchor.getAttribute("download") !== null) return false;

  const href = anchor.getAttribute("href");
  if (!href || isContactHref(href)) return false;

  let destination: URL;
  try {
    destination = new URL(href, currentUrl);
  } catch {
    return false;
  }
  if (destination.origin !== currentUrl.origin) return false;
  return destination.pathname !== currentUrl.pathname;
}
