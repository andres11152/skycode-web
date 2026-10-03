import { describe, expect, it } from "vitest";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";

describe("portfolioPaths", () => {
  it("el español conserva su URL histórica y en/fr usan el slug traducido", () => {
    expect(portfolioIndexPath("es")).toBe("/portafolio");
    expect(portfolioIndexPath("en")).toBe("/en/portfolio");
    expect(portfolioIndexPath("fr")).toBe("/fr/portfolio");
  });

  it("el caso comparte slug en los tres idiomas y solo cambia el prefijo", () => {
    expect(portfolioCasePath("es", "sentry-crm")).toBe("/portafolio/sentry-crm");
    expect(portfolioCasePath("en", "sentry-crm")).toBe("/en/portfolio/sentry-crm");
    expect(portfolioCasePath("fr", "sentry-crm")).toBe("/fr/portfolio/sentry-crm");
  });
});
