// Estado del tema en el navegador: una preferencia ("system" | "light" | "dark") guardada en
// localStorage solo cuando la persona ELIGE claro u oscuro (ver cookieInventory.ts), más el
// atributo `data-theme` de <html> que lee theme.css. Pensado para useSyncExternalStore.
// Solo cliente: el servidor nunca sabe el tema (así el HTML sigue siendo estático).

import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const CHANGE_EVENT = "skycode-theme-change";

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage bloqueado (modo privado, datos de sitio bloqueados): se queda en "Sistema".
  }
  return "system";
}

export function subscribeThemePreference(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // otra pestaña cambió el tema
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Tema que realmente se está viendo ahora (resuelve "Sistema" con prefers-color-scheme). */
export function resolveEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function commit(preference: ThemePreference): void {
  const root = document.documentElement;
  try {
    // "Sistema" no guarda nada: quien nunca elige no deja ningún rastro en el navegador.
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin storage el cambio igual se aplica a esta sesión.
  }
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * Cambia el tema. Con `origin` (coordenadas del clic) y soporte del navegador, el tema nuevo
 * se revela como un círculo que crece desde el botón (View Transitions + clip-path, estilos en
 * globals.css `.theme-switching`). Sin soporte, o con reduced motion, el cambio es instantáneo.
 */
export function setThemePreference(next: ThemePreference, origin?: { x: number; y: number }): void {
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sameVisualTheme = resolveEffectiveTheme(next) === resolveEffectiveTheme(readThemePreference());

  // Si el aspecto no cambia (p. ej. de "Sistema" a la opción que ya coincide), no hay nada que revelar.
  if (!origin || reduced || sameVisualTheme || !doc.startViewTransition) {
    commit(next);
    return;
  }

  const root = document.documentElement;
  const radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
  root.style.setProperty("--theme-x", `${origin.x}px`);
  root.style.setProperty("--theme-y", `${origin.y}px`);
  root.style.setProperty("--theme-r", `${Math.ceil(radius)}px`);
  root.classList.add("theme-switching");

  const transition = doc.startViewTransition(() => commit(next));
  const cleanup = () => {
    root.classList.remove("theme-switching");
    root.style.removeProperty("--theme-x");
    root.style.removeProperty("--theme-y");
    root.style.removeProperty("--theme-r");
  };
  transition.finished.then(cleanup, cleanup);
}

/**
 * Tema que el CSS está aplicando AHORA (no la preferencia): para componentes que dibujan fuera de
 * CSS (canvas/WebGL) y deben repintarse al cambiar de tema. Respeta el interruptor (sin
 * `data-dark-ready` siempre es claro) y las rutas solo-claro (`data-theme="light"`).
 */
export function readAppliedTheme(): "light" | "dark" {
  const root = document.documentElement;
  if (!root.hasAttribute("data-dark-ready")) return "light";
  const explicit = root.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function subscribeAppliedTheme(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const unsubscribePreference = subscribeThemePreference(onChange);
  media.addEventListener("change", onChange); // el sistema cambió y la preferencia es "Sistema"
  // `data-theme` también lo cambia ThemeSync al navegar a una ruta solo-claro.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    unsubscribePreference();
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}
