import { cn } from "@/lib/utils";

export type AlertTone = "error" | "success";

const TONE_STYLES: Record<AlertTone, string> = {
  error: "border-danger/25 bg-danger/10 text-danger",
  success: "border-success/25 bg-success/10 text-success",
};

/**
 * Caja de feedback de formulario — reemplaza las cajas rojo/verde
 * duplicadas en SettingsForm/CampaignsBoard/etc.
 */
export function Alert({ tone, className, children }: { tone: AlertTone; className?: string; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border p-3 text-xs", TONE_STYLES[tone], className)}
    >
      {children}
    </div>
  );
}
