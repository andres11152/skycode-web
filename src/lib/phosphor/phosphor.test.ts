import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as real from "@phosphor-icons/react/ssr";
import * as lite from "@/lib/phosphor";

type IconComponent = ComponentType<{ size?: number; weight?: string; className?: string; "aria-hidden"?: boolean; mirrored?: boolean; alt?: string }>;

const liteIcons = Object.entries(lite) as [string, IconComponent][];
const realIcons = real as unknown as Record<string, IconComponent>;
const WEIGHTS = ["regular", "bold", "duotone", "fill"];

describe("phosphorLite", () => {
  it("exporta íconos", () => {
    expect(liteIcons.length).toBeGreaterThan(40);
  });

  it.each(liteIcons)("%s dibuja el mismo SVG que @phosphor-icons/react en cada peso", (name, Lite) => {
    const Real = realIcons[name];
    expect(Real, `${name} existe en el paquete original`).toBeDefined();
    for (const weight of WEIGHTS) {
      const props = { size: 22, weight, className: "x", "aria-hidden": true as const };
      expect(renderToStaticMarkup(createElement(Lite, props))).toBe(renderToStaticMarkup(createElement(Real, props)));
    }
  });

  it("respeta mirrored y alt, y un peso desconocido cae a regular", () => {
    const Lite = lite.ArrowRight as unknown as IconComponent;
    const Real = realIcons.ArrowRight;
    const extra = { size: 16, mirrored: true, alt: "Siguiente" };
    expect(renderToStaticMarkup(createElement(Lite, extra))).toBe(renderToStaticMarkup(createElement(Real, extra)));
    expect(renderToStaticMarkup(createElement(Lite, { size: 16, weight: "thin" }))).toBe(
      renderToStaticMarkup(createElement(Lite, { size: 16, weight: "regular" }))
    );
  });
});
