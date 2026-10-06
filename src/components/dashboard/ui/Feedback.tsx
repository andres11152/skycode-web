"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

/**
 * Respuesta a toda acción del panel: avisos (toast) y confirmaciones.
 *
 * Antes cada tablero decidía solo — `window.confirm` en unos, nada en otros,
 * y varios `fetch` ignoraban `!res.ok` sin decir nada. Un solo proveedor
 * (montado en DashboardChrome y PortalChrome) da dos funciones:
 *
 *   const { toast, confirm } = useFeedback();
 *   toast({ tone: "error", message: "No se pudo guardar" });
 *   if (!(await confirm({ title: "¿Eliminar el gasto?", tone: "danger" }))) return;
 *
 * Sin librería: ~100 líneas, `role="status"`/`role="alert"` según el tono, y
 * entrada en CSS (`animate-enter-from-bottom`) que respeta reduced motion.
 */

export type ToastTone = "success" | "error" | "info";

interface ToastInput {
  tone?: ToastTone;
  message: string;
}

interface ToastItem extends Required<ToastInput> {
  id: number;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` pinta el botón de confirmar con el color de peligro. */
  tone?: "default" | "danger";
  /** Si se pasa, pide un texto (ej. motivo de rechazo) y `confirm` resuelve con él. */
  input?: { label: string; placeholder?: string; required?: boolean; multiline?: boolean };
  /** Exige escribir este texto exacto para habilitar la confirmación (acciones irreversibles). */
  typeToConfirm?: string;
}

/** `true`/`false`, o el texto escrito cuando se usó `input`; `null` si se canceló. */
type ConfirmResult = boolean | string | null;

interface FeedbackApi {
  toast: (input: ToastInput) => void;
  confirm: (options: ConfirmOptions & { input?: undefined }) => Promise<boolean>;
  prompt: (options: ConfirmOptions & { input: NonNullable<ConfirmOptions["input"]> }) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback debe usarse dentro de <FeedbackProvider>");
  return ctx;
}

const TOAST_MS = 5000;

const TOAST_TONE: Record<ToastTone, string> = {
  success: "border-success/25 text-success",
  error: "border-danger/25 text-danger",
  info: "border-foreground/15 text-foreground",
};

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    // Un error se queda más: leerlo y actuar lleva más que un "Guardado".
    const timer = setTimeout(onDismiss, toast.tone === "error" ? TOAST_MS * 2 : TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon = toast.tone === "error" ? WarningCircle : CheckCircle;
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "animate-enter-from-bottom pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-background px-4 py-3 text-xs font-medium shadow-lg shadow-black/10",
        TOAST_TONE[toast.tone],
      )}
    >
      <Icon size={16} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
      <span className="min-w-0 flex-1 break-words text-foreground">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/70 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: ConfirmResult) => void;
}

function ConfirmDialog({ pending, onResolve }: { pending: PendingConfirm | null; onResolve: (value: ConfirmResult) => void }) {
  const inputId = useId();
  const [text, setText] = useState("");
  const options = pending?.options;

  // Reinicia el campo cada vez que se abre otro diálogo.
  const lastPending = useRef<PendingConfirm | null>(null);
  useEffect(() => {
    if (pending !== lastPending.current) {
      lastPending.current = pending;
      setText("");
    }
  }, [pending]);

  const needsTyped = options?.typeToConfirm !== undefined;
  const typedOk = !needsTyped || text.trim() === options?.typeToConfirm;
  const inputOk = !options?.input?.required || text.trim().length > 0;
  const canConfirm = typedOk && inputOk;
  const showField = Boolean(options?.input) || needsTyped;

  return (
    <Modal
      open={pending !== null}
      onClose={() => onResolve(null)}
      title={options?.title}
      description={options?.description}
      closeLabel="Cancelar"
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onResolve(null)}>
            {options?.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={!canConfirm}
            onClick={() => onResolve(options?.input ? text.trim() : true)}
            className={cn(options?.tone === "danger" && "bg-danger")}
          >
            {options?.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      }
    >
      {showField && options && (
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block text-xs font-semibold text-foreground/80">
            {needsTyped ? `Escribe «${options.typeToConfirm}» para confirmar` : options.input?.label}
          </label>
          {options.input?.multiline ? (
            <textarea
              id={inputId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={options.input.placeholder}
              rows={3}
              className="w-full rounded-xl border border-foreground/15 bg-foreground/[0.02] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          ) : (
            <input
              id={inputId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={options.input?.placeholder}
              autoComplete="off"
              className="w-full rounded-xl border border-foreground/15 bg-foreground/[0.02] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          )}
        </div>
      )}
    </Modal>
  );
}

export function FeedbackProvider({
  children,
  toastOffsetClassName = "pb-[max(1rem,env(safe-area-inset-bottom))]",
}: {
  children: React.ReactNode;
  /** Separación inferior de los avisos (el panel la sube para no quedar bajo la barra inferior móvil). */
  toastOffsetClassName?: string;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const toast = useCallback(({ tone = "success", message }: ToastInput) => {
    const id = nextId.current++;
    // Tope de 3: una ráfaga de errores no debe tapar la pantalla.
    setToasts((all) => [...all.slice(-2), { id, tone, message }]);
  }, []);

  const ask = useCallback(
    (options: ConfirmOptions) =>
      new Promise<ConfirmResult>((resolve) => {
        setPending({ options, resolve });
      }),
    [],
  );

  const resolvePending = useCallback((value: ConfirmResult) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const api = useMemo<FeedbackApi>(
    () => ({
      toast,
      confirm: async (options) => (await ask(options)) === true,
      prompt: async (options) => {
        const result = await ask(options);
        return typeof result === "string" ? result : null;
      },
    }),
    [toast, ask],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {/* z-[75]: encima del Modal (z-70), para que un error de guardado dentro de un diálogo se vea. */}
      <div className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-[75] flex flex-col items-center gap-2 px-4 lg:items-end lg:px-6", toastOffsetClassName)}>
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      </div>
      <ConfirmDialog pending={pending} onResolve={resolvePending} />
    </FeedbackContext.Provider>
  );
}
