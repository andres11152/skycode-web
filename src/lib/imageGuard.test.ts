import { describe, expect, it } from "vitest";
import { hasAllowedImageSignature } from "./imageGuard";

const pad = (b: number[]) => Buffer.concat([Buffer.from(b), Buffer.alloc(16)]);

describe("hasAllowedImageSignature", () => {
  it("acepta JPEG, PNG y WebP", () => {
    expect(hasAllowedImageSignature(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(hasAllowedImageSignature(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(4)]);
    expect(hasAllowedImageSignature(webp)).toBe(true);
  });
  it("rechaza SVG, texto y buffers cortos", () => {
    expect(hasAllowedImageSignature(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(false);
    expect(hasAllowedImageSignature(Buffer.from("hola"))).toBe(false);
    expect(hasAllowedImageSignature(Buffer.alloc(0))).toBe(false);
  });
});
