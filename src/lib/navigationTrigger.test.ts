import { describe, expect, it } from "vitest";
import type { ClickLike } from "@/lib/contactModalTrigger";
import { shouldTrackNavigation } from "./navigationTrigger";

const plain: ClickLike = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const anchor = (attrs: Record<string, string>) => ({ getAttribute: (n: string) => attrs[n] ?? null });
const here = new URL("https://skycode.agency/servicios");

describe("shouldTrackNavigation", () => {
  it("enciende la barra al ir a otra ruta del mismo sitio", () => {
    expect(shouldTrackNavigation(plain, anchor({ href: "/portafolio" }), here)).toBe(true);
    expect(shouldTrackNavigation(plain, anchor({ href: "/en/portfolio" }), here)).toBe(true);
    expect(shouldTrackNavigation(plain, anchor({ href: "https://skycode.agency/blog" }), here)).toBe(true);
  });

  it("no la enciende si el destino es la misma página (ancla o query)", () => {
    expect(shouldTrackNavigation(plain, anchor({ href: "/servicios" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "/servicios#proceso" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "#proceso" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "/servicios?x=1" }), here)).toBe(false);
  });

  it("no la enciende para el enlace al formulario de contacto (abre un modal)", () => {
    expect(shouldTrackNavigation(plain, anchor({ href: "/#contacto" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "/en/#contacto" }), here)).toBe(false);
  });

  it("no la enciende para otro origen, mailto ni tel", () => {
    expect(shouldTrackNavigation(plain, anchor({ href: "https://example.com/x" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "//evil.com/x" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "mailto:a@b.co" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "tel:+573138081081" }), here)).toBe(false);
  });

  it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"] as const)("no la enciende con %s (nueva pestaña/ventana)", (key) => {
    expect(shouldTrackNavigation({ ...plain, [key]: true }, anchor({ href: "/portafolio" }), here)).toBe(false);
  });

  it("respeta botón central, defaultPrevented, target y download", () => {
    expect(shouldTrackNavigation({ ...plain, button: 1 }, anchor({ href: "/portafolio" }), here)).toBe(false);
    expect(shouldTrackNavigation({ ...plain, defaultPrevented: true }, anchor({ href: "/portafolio" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "/portafolio", target: "_blank" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({ href: "/x.pdf", download: "" }), here)).toBe(false);
    expect(shouldTrackNavigation(plain, anchor({}), here)).toBe(false);
  });
});
