// ARCHIVO GENERADO por scripts/gen-phosphor-lite.mjs: no editar a mano.
// Fábrica de íconos de Phosphor (MIT, https://phosphoricons.com) a partir de trazos. Un peso desconocido
// cae a regular. Mismo SVG que `@phosphor-icons/react` (lo verifica phosphor.test.ts).
import { createElement, forwardRef, type ReactElement, type SVGProps } from "react";

export type Weight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
export type Path = readonly [d: string, opacity?: string];

export interface LiteIconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  alt?: string;
  color?: string;
  size?: string | number;
  weight?: Weight;
  mirrored?: boolean;
}

export function icon(name: string, weights: Record<string, readonly Path[]>) {
  const Component = forwardRef<SVGSVGElement, LiteIconProps>(function LiteIcon(
    { alt, color = "currentColor", size = "1em", weight = "regular", mirrored = false, children, ...rest },
    ref
  ): ReactElement {
    const paths = weights[weight] ?? weights.regular;
    return createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        fill: color,
        viewBox: "0 0 256 256",
        transform: mirrored ? "scale(-1, 1)" : undefined,
        ...rest,
      },
      alt ? createElement("title", null, alt) : null,
      children,
      paths.map(([d, opacity]) => createElement("path", { key: d, d, opacity }))
    );
  });
  Component.displayName = `${name}Icon`;
  return Component;
}
