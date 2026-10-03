import { describe, expect, it } from "vitest";
import { isContactHref, shouldOpenContactModal, type ClickLike } from "./contactModalTrigger";

const plain: ClickLike = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const anchor = (attrs: Record<string, string>) => ({ getAttribute: (n: string) => attrs[n] ?? null });

describe("isContactHref", () => {
  it.each(["#contacto", "/#contacto", "/en/#contacto", "/fr#contacto", "/en#contacto"])("acepta %s", (h) => {
    expect(isContactHref(h)).toBe(true);
  });
  it.each([null, "", "#faq", "/#servicios", "/portafolio#contacto", "https://x.com/#contacto", "//evil.com/#contacto", "/es/#contacto"])(
    "rechaza %s",
    (h) => expect(isContactHref(h)).toBe(false),
  );
});

describe("shouldOpenContactModal", () => {
  it("abre con un clic normal", () => {
    expect(shouldOpenContactModal(plain, anchor({ href: "/#contacto" }))).toBe(true);
  });
  it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"] as const)("no intercepta con %s", (k) => {
    expect(shouldOpenContactModal({ ...plain, [k]: true }, anchor({ href: "/#contacto" }))).toBe(false);
  });
  it("no intercepta botón central ni defaultPrevented", () => {
    expect(shouldOpenContactModal({ ...plain, button: 1 }, anchor({ href: "/#contacto" }))).toBe(false);
    expect(shouldOpenContactModal({ ...plain, defaultPrevented: true }, anchor({ href: "/#contacto" }))).toBe(false);
  });
  it("respeta target=_blank y download", () => {
    expect(shouldOpenContactModal(plain, anchor({ href: "/#contacto", target: "_blank" }))).toBe(false);
    expect(shouldOpenContactModal(plain, anchor({ href: "/#contacto", download: "" }))).toBe(false);
  });
});
