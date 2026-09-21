import { cn } from "@/lib/utils";

export type AlertTone = "error" | "success";

const TONE_STYLES: Record<AlertTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
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
