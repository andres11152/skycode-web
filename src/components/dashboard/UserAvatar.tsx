import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-14 w-14 text-base",
  lg: "h-24 w-24 text-2xl",
} as const;

const SIZE_PX = { xs: 28, sm: 36, md: 56, lg: 96 } as const;

/** Primera letra del primer y del último nombre — "Ana María López" → "AL". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Avatar de persona: la foto si existe, si no las iniciales sobre fondo
 * neutro (nunca un color de acento por persona — el azul de marca está
 * reservado para 2-3 puntos de contacto, ver CLAUDE.md). Sin `"use client"`:
 * funciona en Server y Client Components por igual.
 *
 * `alt=""` con el nombre en `aria-label` del contenedor solo cuando el
 * avatar va solo; si al lado ya se muestra el nombre en texto (el caso
 * habitual), pasar `decorative` para que el lector de pantalla no lo lea
 * dos veces.
 */
export function UserAvatar({
  name,
  src,
  size = "sm",
  decorative = false,
  className,
}: {
  name: string;
  src: string | null | undefined;
  size?: keyof typeof SIZE_CLASSES;
  decorative?: boolean;
  className?: string;
}) {
  const label = decorative ? undefined : `Foto de ${name}`;

  if (src) {
    return (
      <span
        className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-foreground/5 ring-1 ring-foreground/10", SIZE_CLASSES[size], className)}
        role={decorative ? undefined : "img"}
        aria-label={label}
        aria-hidden={decorative || undefined}
      >
        <Image src={src} alt="" width={SIZE_PX[size]} height={SIZE_PX[size]} className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] font-bold tracking-tight text-foreground/70 ring-1 ring-foreground/10",
        SIZE_CLASSES[size],
        className
      )}
      role={decorative ? undefined : "img"}
      aria-label={label}
      aria-hidden={decorative || undefined}
    >
      {initials(name)}
    </span>
  );
}
