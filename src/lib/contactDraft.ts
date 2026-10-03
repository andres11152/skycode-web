/**
 * Borrador del formulario de contacto, solo en memoria del módulo.
 *
 * Quien cierra el modal por error (o para mirar un caso del portafolio y volver)
 * no pierde lo escrito. No toca `localStorage`/`sessionStorage` a propósito:
 * guardar nombre, correo y mensaje en el navegador sería tratar datos
 * personales sin que la persona los haya enviado, y obligaría a declararlo en
 * el inventario de cookies. Se pierde al recargar la página, y eso es lo correcto.
 */
export interface ContactDraft {
  name: string;
  email: string;
  message: string;
  serviceSlug: string;
}

const EMPTY: ContactDraft = { name: "", email: "", message: "", serviceSlug: "" };
let current: ContactDraft = EMPTY;

export function readContactDraft(): ContactDraft {
  return current;
}

export function saveContactDraft(draft: ContactDraft): void {
  current = draft;
}

export function clearContactDraft(): void {
  current = EMPTY;
}
