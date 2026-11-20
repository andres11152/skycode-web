import Image from "next/image";
import { cn } from "@/lib/utils";
import { ENABLE_DARK_MODE } from "@/lib/theme";

const SOURCES = {
  mark: { light: "/logo-mark.png", dark: "/logo-mark-dark.png" },
  full: { light: "/logo-full.png", dark: "/logo-full-dark.png" },
} as const;

/**
 * Logo con las letras "Sky/Code" en negro: sobre fondo oscuro desaparecen, así que existe una
 * versión con las letras en #ededed (azul y amarillo de marca intactos). Se renderizan las dos
 * y CSS muestra la que toca (`.hide-on-dark`/`.show-on-dark`, theme.css): sin JavaScript y sin
 * parpadeo al cargar. La oscura es `lazy`: con el tema claro nunca se descarga.
 * Las dos llevan el mismo `alt`: la que no toca tiene `display: none`, que la saca también del árbol de
 * accesibilidad, así que un lector de pantalla anuncia una sola (antes la oscura iba con `alt=""` y, con el
 * tema oscuro activo, el logo visible quedaba sin texto alternativo).
 * Server Component (sin "use client"): funciona igual dentro de uno cliente.
 */
export function ThemedLogo({
  variant,
  alt,
  width,
  height,
  className,
  priority,
  fetchPriority,
}: {
  variant: keyof typeof SOURCES;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}) {
  const sources = SOURCES[variant];
  return (
    <>
      <Image
        src={sources.light}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        fetchPriority={fetchPriority}
        className={cn(ENABLE_DARK_MODE && "hide-on-dark", className)}
      />
      {ENABLE_DARK_MODE ? (
        <Image
          src={sources.dark}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className={cn("show-on-dark", className)}
        />
      ) : null}
    </>
  );
}
