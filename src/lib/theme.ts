// Modo oscuro: constantes y script anti-destello. Módulo puro (sin DOM, sin `node:`):
// lo importan el layout raíz (servidor), lib/csp.ts (que corre en Edge vía proxy.ts) y
// los componentes cliente del selector de tema.

/**
 * Interruptor único del modo oscuro. Apagado por defecto: sin la variable, el layout no
 * pone `data-dark-ready` en <html>, no renderiza el script y el CSS oscuro de theme.css
 * no selecciona nada — el sitio es el claro de siempre. Para revisarlo en local:
 * `NEXT_PUBLIC_ENABLE_DARK_MODE=true` en `.env.local`. Encenderlo en producción es una
 * decisión explícita, no un efecto de mergear.
 */
export const ENABLE_DARK_MODE = process.env.NEXT_PUBLIC_ENABLE_DARK_MODE === "true";

export type ThemePreference = "system" | "light" | "dark";

/** Clave en localStorage. Solo se escribe cuando la persona ELIGE claro u oscuro; "Sistema" no guarda nada. */
export const THEME_STORAGE_KEY = "skycode-theme";

/**
 * Rutas que siguen en claro mientras el panel/portal/auth no tengan su paleta oscura
 * (fase 5 del plan: sus tokens de estado y ~27 colores fijos están pensados para fondo
 * claro). Espejo de STRICT_CSP_PREFIXES en lib/csp.ts — `theme.test.ts` verifica que
 * coincidan. No se importa de csp.ts porque csp.ts importa el hash de este módulo.
 */
export const LIGHT_ONLY_PREFIXES = [
  "login",
  "olvide-password",
  "resetear-password",
  "invitar",
  "dashboard",
  "portal",
] as const;

export function isLightOnlyPath(pathname: string): boolean {
  const first = pathname.split("/")[1] ?? "";
  return (LIGHT_ONLY_PREFIXES as readonly string[]).includes(first);
}

/**
 * Se ejecuta de forma bloqueante en el <head>, ANTES de pintar el <body>: sin esto, quien
 * eligió oscuro vería un destello blanco en cada carga. Solo fija `data-theme`; el resto
 * (el tema de "Sistema") lo resuelve CSS con prefers-color-scheme, sin JS.
 *
 *  - rutas solo-claro  → data-theme="light" (aunque el sistema esté en oscuro)
 *  - elección guardada → data-theme="light"|"dark"
 *  - sin elección      → no toca nada (gana el sistema)
 *
 * Texto fijo y mínimo A PROPÓSITO: la CSP estricta lo autoriza por su hash SHA-256
 * (`THEME_SCRIPT_SHA256`). Cualquier cambio de un byte cambia el hash; el test
 * `theme.test.ts` lo detecta y dice cómo regenerarlo.
 */
export const THEME_INIT_SCRIPT =
  `(function(){try{var d=document.documentElement;` +
  `if(/^\\/(${LIGHT_ONLY_PREFIXES.join("|")})(\\/|$)/.test(location.pathname)){d.setAttribute("data-theme","light");return}` +
  `var s=localStorage.getItem("${THEME_STORAGE_KEY}");` +
  `if(s==="light"||s==="dark")d.setAttribute("data-theme",s)}catch(e){}})()`;

/** `sha256-…` en base64 de THEME_INIT_SCRIPT, tal como lo escribe una CSP. Verificado por theme.test.ts. */
export const THEME_SCRIPT_SHA256 = "sha256-pRBgG8BeE4cAMUUEd4BD1bGxetFYLKqmaobEyhFMwG0=";
