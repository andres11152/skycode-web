/**
 * Copia texto al portapapeles. Devuelve `true` si se pudo y `false` si no —
 * nunca lanza, para que la UI decida qué mostrar.
 *
 * `navigator.clipboard` solo existe en contextos seguros (HTTPS/localhost) y
 * puede rechazar por permisos; en ese caso se intenta el camino clásico con
 * un `<textarea>` temporal y `execCommand("copy")`, que aún cubre WebViews
 * y navegadores antiguos dentro del `browserslist` del proyecto.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permiso denegado o documento sin foco: se prueba el respaldo.
  }

  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  // Fuera de pantalla y sin provocar scroll al enfocarse.
  area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
