/** Indicador "Cambios sin guardar" para junto al botón de guardar (ver lib/useUnsavedChanges). */
export function UnsavedNotice({ dirty }: { dirty: boolean }) {
  return (
    <span role="status" className="inline-flex min-h-6 items-center gap-1.5 text-xs font-medium text-warning">
      {dirty && (
        <>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning" />
          Cambios sin guardar
        </>
      )}
    </span>
  );
}
