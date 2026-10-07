import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

function FieldSkeleton({ inputClassName }: { inputClassName: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className={cn("rounded-lg", inputClassName)} />
    </div>
  );
}

/**
 * Forma exacta del formulario de contacto (nombre, correo, servicio, mensaje,
 * consentimiento y botón) mientras se carga su chunk. Mismas alturas y
 * separaciones que `ContactForm`, así al hidratar no hay salto de layout.
 * `variant="modal"` usa la separación y las dos columnas del modal.
 */
export function ContactFormSkeleton({ variant = "section" }: { variant?: "section" | "modal" }) {
  const isModal = variant === "modal";
  return (
    <div aria-hidden="true" className={cn("flex flex-col", isModal ? "gap-4" : "gap-5")}>
      <div className={cn("flex flex-col", isModal ? "gap-4 sm:grid sm:grid-cols-2" : "gap-5")}>
        <FieldSkeleton inputClassName="h-11" />
        <FieldSkeleton inputClassName="h-11" />
      </div>
      <FieldSkeleton inputClassName="h-11" />
      <FieldSkeleton inputClassName="h-32" />
      <Skeleton className="h-14 rounded-lg" />
      <Skeleton className="mt-1 h-[52px] rounded-full" />
    </div>
  );
}

/** Sección completa de contacto de la home (cabecera + formulario) para el `loading` de su carga diferida. */
export function ContactSectionSkeleton({ label }: { label: string }) {
  return (
    <section id="contacto" aria-busy="true" className="scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28">
      <span role="status" className="sr-only">
        {label}
      </span>
      <div className="mx-auto max-w-xl">
        <div aria-hidden="true" className="mb-12 flex flex-col items-center gap-4">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-10 w-4/5 rounded-lg sm:h-12" />
          <Skeleton className="h-4 w-3/5 rounded" />
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-32 rounded-full" />
            ))}
          </div>
        </div>
        <ContactFormSkeleton />
      </div>
    </section>
  );
}

/** Marco del modal de contacto con el formulario en skeleton, para la primera apertura (el chunk aún no llegó). */
export function ContactModalSkeleton({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="status"
        aria-busy="true"
        className="w-full max-w-2xl rounded-t-xl bg-background p-6 sm:rounded-xl sm:p-8"
      >
        <span className="sr-only">{label}</span>
        <div aria-hidden="true" className="mb-6 flex flex-col gap-3">
          <Skeleton className="h-7 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
        <ContactFormSkeleton variant="modal" />
      </div>
    </div>
  );
}
