import { describe, expect, it } from "vitest";
import imageLoader from "./imageLoader";

const BASE = "https://pub-abc.r2.dev/1234-uuid";

describe("imageLoader", () => {
  it("elige la variante más chica que cubre el ancho pedido", () => {
    expect(imageLoader({ src: `${BASE}-md.webp`, width: 384 })).toBe(`${BASE}-sm.webp`);
    expect(imageLoader({ src: `${BASE}-md.webp`, width: 640 })).toBe(`${BASE}-md.webp`);
    expect(imageLoader({ src: `${BASE}-md.webp`, width: 1200 })).toBe(`${BASE}-lg.webp`);
  });

  it("no inventa la variante xl: solo se usa si quien llama ya la pidió", () => {
    expect(imageLoader({ src: `${BASE}-lg.webp`, width: 2560 })).toBe(`${BASE}-lg.webp`);
    expect(imageLoader({ src: `${BASE}-xl.webp`, width: 2560 })).toBe(`${BASE}-xl.webp`);
    expect(imageLoader({ src: `${BASE}-xl.webp`, width: 700 })).toBe(`${BASE}-md.webp`);
  });

  it("usa los anchos propios de los avatares", () => {
    const avatar = "https://pub-abc.r2.dev/avatars/u-uuid";
    expect(imageLoader({ src: `${avatar}-sm.webp`, width: 100 })).toBe(`${avatar}-md.webp`);
    expect(imageLoader({ src: `${avatar}-sm.webp`, width: 256 })).toBe(`${avatar}-lg.webp`);
  });

  it("deja pasar los archivos locales sin transformarlos", () => {
    expect(imageLoader({ src: "/logo-full.png", width: 384 })).toBe("/logo-full.png?w=384");
  });
});
