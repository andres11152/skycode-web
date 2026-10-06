import { WarningCircle } from "@phosphor-icons/react/ssr";

/**
 * Mensaje de error bajo un campo. Entra con un fundido + 4px de
 * desplazamiento (CSS, `animate-enter-error`) en vez de aparecer de golpe.
 * Se enlaza al input con `aria-describedby={id}` (+ `aria-invalid`), así el
 * lector de pantalla lo lee al enfocar el campo — sin `role="alert"`, que en
 * un envío fallido anunciaría todos los errores a la vez.
 */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="animate-enter-error flex items-center gap-1 text-xs font-medium text-danger">
      <WarningCircle size={12} aria-hidden="true" /> {children}
    </p>
  );
}
