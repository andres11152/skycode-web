import { describe, expect, it } from "vitest";
import { CURRENCIES, convertCurrency, isValidCurrency } from "./currency";

describe("currency", () => {
  describe("CURRENCIES", () => {
    it("solo soporta COP y USD", () => {
      expect(CURRENCIES).toEqual(["COP", "USD"]);
    });
  });

  describe("isValidCurrency", () => {
    it("acepta COP y USD", () => {
      expect(isValidCurrency("COP")).toBe(true);
      expect(isValidCurrency("USD")).toBe(true);
    });

    it("rechaza otras monedas y strings arbitrarios", () => {
      expect(isValidCurrency("EUR")).toBe(false);
      expect(isValidCurrency("cop")).toBe(false); // sensible a mayúsculas
      expect(isValidCurrency("")).toBe(false);
      expect(isValidCurrency("USD ")).toBe(false);
    });
  });

  describe("convertCurrency", () => {
    const RATE = 4000; // 1 USD = 4000 COP, tasa de prueba redonda

    it("misma moneda: devuelve el monto sin tocar (ni con tasa distinta de la real)", () => {
      expect(convertCurrency(100, "COP", "COP", RATE)).toBe(100);
      expect(convertCurrency(100, "USD", "USD", RATE)).toBe(100);
    });

    it("USD → COP: multiplica por la tasa", () => {
      expect(convertCurrency(10, "USD", "COP", RATE)).toBe(40000);
      expect(convertCurrency(0, "USD", "COP", RATE)).toBe(0);
    });

    it("COP → USD: divide por la tasa", () => {
      expect(convertCurrency(40000, "COP", "USD", RATE)).toBe(10);
      expect(convertCurrency(0, "COP", "USD", RATE)).toBe(0);
    });

    it("USD → COP → USD es el inverso exacto (ida y vuelta sin pérdida)", () => {
      const original = 123.45;
      const toCop = convertCurrency(original, "USD", "COP", RATE);
      const backToUsd = convertCurrency(toCop, "COP", "USD", RATE);
      expect(backToUsd).toBeCloseTo(original, 10);
    });

    it("con la tasa real del día (no redonda) sigue siendo consistente", () => {
      const realRate = 3198.300858;
      const fiftyUsdInCop = convertCurrency(50, "USD", "COP", realRate);
      expect(fiftyUsdInCop).toBeCloseTo(159915.0429, 4);
    });

    it("montos negativos se convierten igual (el signo no se pierde)", () => {
      expect(convertCurrency(-10, "USD", "COP", RATE)).toBe(-40000);
    });
  });
});
