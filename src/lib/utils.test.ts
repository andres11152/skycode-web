import { describe, expect, it } from "vitest";
import { toCsvCell } from "./utils";

describe("toCsvCell", () => {
  it("wraps plain values in quotes", () => {
    expect(toCsvCell("Ada")).toBe('"Ada"');
  });

  it("escapes embedded double quotes", () => {
    expect(toCsvCell('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("neutralizes leading = to prevent CSV formula injection", () => {
    expect(toCsvCell("=cmd|'/c calc'!A1")).toBe(`"'=cmd|'/c calc'!A1"`);
  });

  it("neutralizes leading +, -, and @ as well", () => {
    expect(toCsvCell("+1+1")).toBe(`"'+1+1"`);
    expect(toCsvCell("-1")).toBe(`"'-1"`);
    expect(toCsvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
  });

  it("leaves safe values untouched aside from quoting", () => {
    expect(toCsvCell("normal text")).toBe('"normal text"');
  });

  it("accepts numbers", () => {
    expect(toCsvCell(42)).toBe('"42"');
  });
});
